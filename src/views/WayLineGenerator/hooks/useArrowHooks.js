import * as Cesium from 'cesium'

export function useArrowHooks(viewer, entitiesRef) {
  const { Cartesian3, VerticalOrigin, HeightReference } = Cesium
  
  // 添加箭头
  const addArrow = (startPoint, endPoint) => {
    if (!viewer || !entitiesRef || !startPoint || !endPoint) return null
    
    // 计算中点位置
    const startCartesian = Cartesian3.fromDegrees(
      startPoint.longitude, 
      startPoint.latitude, 
      startPoint.height || 0
    )
    const endCartesian = Cartesian3.fromDegrees(
      endPoint.longitude, 
      endPoint.latitude, 
      endPoint.height || 0
    )
    const midPoint = Cartesian3.midpoint(startCartesian, endCartesian, new Cartesian3())
    
    // 计算方向向量
    const direction = Cartesian3.subtract(endCartesian, startCartesian, new Cartesian3())
    Cartesian3.normalize(direction, direction)
    
    // 计算旋转角度
    const rotation = -Math.atan2(direction.x, direction.y)
    
    // 创建箭头实体
    const arrowEntity = {
      position: midPoint,
      billboard: {
        image: 'data:image/svg+xml;base64,' +
          btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="white" d="M7 10l5 5 5-5z" stroke="black" stroke-width="1"/>
            </svg>
          `),
        scale: 0.8,
        verticalOrigin: VerticalOrigin.CENTER,
        heightReference: HeightReference.NONE,
        rotation: rotation
      },
      isArrow: true
    }
    
    // 添加到实体集合
    entitiesRef.value.push(arrowEntity)
    
    return arrowEntity
  }
  
  return { addArrow }
}