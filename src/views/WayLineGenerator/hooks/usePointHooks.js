import * as Cesium from 'cesium'

export function usePointHooks(viewer, entitiesRef) {
  const { Cartesian3, Color, VerticalOrigin, HeightReference } = Cesium
  
  // 航点计数器
  let waypointCount = 0
  
  // 添加航点
  const addWaypoint = (cartesian) => {
    if (!viewer || !entitiesRef) return null
    
    waypointCount++
    
    // 将世界坐标转换为经纬度
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    const height = cartographic.height > 0 ? cartographic.height : 200
    
    // 创建航点实体
    const waypointEntity = {
      position: cartesian,
      billboard: {
        image: 'data:image/svg+xml;base64,' +
          btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
              <path d="M0 0 L50 0 L25 50 Z" fill="#1E90FF" stroke="#00008B" stroke-width="1"/>
              <text x="25" y="25" font-size="16" text-anchor="middle" fill="white">${waypointCount}</text>
            </svg>
          `),
        width: 36,
        height: 36,
        verticalOrigin: VerticalOrigin.CENTER,
        heightReference: HeightReference.NONE
      },
      waypointId: waypointCount,
      waypointInfo: {
        longitude,
        latitude,
        height
      }
    }
    
    // 添加到实体集合
    entitiesRef.value.push(waypointEntity)
    
    // 创建地面连接线
    const groundLinkEntity = {
      polyline: {
        positions: [
          Cartesian3.fromDegrees(longitude, latitude, 0), // 地面
          cartesian // 航点高度
        ],
        width: 2,
        material: Color.YELLOW.withAlpha(0.7),
        clampToGround: true
      },
      waypointId: waypointCount,
      isGroundLink: true
    }
    
    entitiesRef.value.push(groundLinkEntity)
    
 // 创建地面圆形标记
    const groundCircleEntity = {
      position: Cartesian3.fromDegrees(longitude, latitude, 0),
      point: {
        pixelSize: 8,
        color: Color.WHITE,
        outlineColor: Color.YELLOW,
        outlineWidth: 1,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      waypointId: waypointCount,
      isGroundCircle: true
    }
    
    entitiesRef.value.push(groundCircleEntity)
    
    // 飞行到航点位置
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(longitude, latitude, height + 500),
      duration: 1
    })
    
    return waypointEntity
  }
  
  // 清除所有航点
  const clearWaypoints = () => {
    if (!entitiesRef) return
    
    // 过滤掉非航点实体
    entitiesRef.value = entitiesRef.value.filter(entity => 
      !entity.waypointId && !entity.isGroundLink && !entity.isGroundCircle
    )
    
    waypointCount = 0
  }
  
  return { addWaypoint, clearWaypoints }
}