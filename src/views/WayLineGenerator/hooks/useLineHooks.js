import * as Cesium from 'cesium'

export function useLineHooks(viewer, entitiesRef) {
  const { Cartesian3, Color, ArcType } = Cesium
  
  // 添加连线
  const addLine = (points) => {
    if (!viewer || !entitiesRef || !points || points.length < 2) return null
    
    // 将经纬度数组转换为Cartesian3数组
    const positions = points.map(point => 
      Cartesian3.fromDegrees(point.longitude, point.latitude, point.height || 0)
    )
    
    // 创建连线实体
    const lineEntity = {
      polyline: {
        positions: positions,
        width: 4,
        material: Color.GREEN,
        clampToGround: false,
        arcType: ArcType.GEODESIC
      },
      isLine: true
    }
    
    // 添加到实体集合
    entitiesRef.value.push(lineEntity)
    
    return lineEntity
  }
  
  return { addLine }
}