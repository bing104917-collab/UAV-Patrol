/**
 * 多边形航线生成器 - 根据多边形区域生成正射影像航线
 * 支持智能间距计算、相机参数配置、路径优化
 */

// 地球半径（米）
const EARTH_RADIUS = 6378137;

// 常用相机参数预设
export const CAMERA_PRESETS = {
  // DJI 御 3 系列
  'm3e': {
    name: 'Mavic 3E',
    sensorWidth: 17.3,    // 传感器宽度（毫米）
    sensorHeight: 13,     // 传感器高度（毫米）
    focalLength: 24,      // 焦距（毫米）
    imageWidth: 5280,     // 图像宽度（像素）
    imageHeight: 3956     // 图像高度（像素）
  },
  'm3t': {
    name: 'Mavic 3T 广角',
    sensorWidth: 6.4,
    sensorHeight: 4.8,
    focalLength: 4.5,
    imageWidth: 1920,
    imageHeight: 1440
  },
  'm30t': {
    name: 'M30T 广角',
    sensorWidth: 6.3,
    sensorHeight: 4.7,
    focalLength: 4.88,
    imageWidth: 1920,
    imageHeight: 1440
  },
  'm300': {
    name: 'M300 RTK + P1',
    sensorWidth: 35.9,
    sensorHeight: 24,
    focalLength: 35,
    imageWidth: 8192,
    imageHeight: 5460
  },
  'm4td':{
    name:'M4TD',
    sensorWidth: 9.65,    // 1英寸CMOS传感器宽度
    sensorHeight: 7.24,    // 1英寸CMOS传感器高度  
    focalLength: 6.73,     // 实际焦距
    imageWidth: 4032,     // 4032 × 3024
    imageHeight: 3024,
  }
};

/**
 * 计算航线间距
 * @param {number} height - 飞行高度（米）
 * @param {object} camera - 相机参数
 * @param {number} overlapRate - 重叠率（0-1）
 * @param {string} direction - 方向（'lateral'横向或'longitudinal'纵向）
 * @returns {number} 航线间距（米）
 */
export const calculateSpacing = (height, camera, overlapRate, direction = 'lateral') => {
  // 选择对应的传感器尺寸（横向用宽度，纵向用高度）
  const sensor = direction === 'lateral' ? camera.sensorWidth : camera.sensorHeight;
  // GSD（地面采样距离）= (高度 * 传感器尺寸) / (焦距 * 图像尺寸)
  // 覆盖宽度 = GSD * 图像尺寸
  const imageSize = direction === 'lateral' ? camera.imageWidth : camera.imageHeight;
  const gsd = (height * sensor) / (camera.focalLength * imageSize);
  
  const coverageWidth = gsd * imageSize;
  
  // 实际间距 = 覆盖宽度 * (1 - 重叠率)
  return coverageWidth * (1 - overlapRate);
};




/**
 * 将经纬度转换为平面坐标（米）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {object} origin - 原点坐标 {lat, lng}
 * @returns {object} 平面坐标 {x, y}（米）
 */
const projectToMeters = (lat, lng, origin) => {
  // 计算与原点的经纬度差（弧度）
  const dLat = (lat - origin.lat) * Math.PI / 180;
  const dLng = (lng - origin.lng) * Math.PI / 180;
  // 将经纬度差转换为平面距离
  const x = dLng * EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180);
  const y = dLat * EARTH_RADIUS;
  return { x, y };
};

/**
 * 将平面坐标（米）转换回经纬度
 * @param {number} x - 平面X坐标（米）
 * @param {number} y - 平面Y坐标（米）
 * @param {object} origin - 原点坐标 {lat, lng}
 * @returns {object} 经纬度坐标 {lat, lng}
 */
const unprojectFromMeters = (x, y, origin) => {
  // 将Y坐标差转换为纬度差（弧度）
  const dLat = y / EARTH_RADIUS;
  // 计算最终纬度
  const lat = origin.lat + dLat * 180 / Math.PI;
  // 将X坐标差转换为经度差（弧度）
  const dLng = x / (EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180));
  // 计算最终经度
  const lng = origin.lng + dLng * 180 / Math.PI;
  return { lat, lng };
};

/**
 * 旋转点坐标
 * @param {object} point - 待旋转点 {x, y}
 * @param {number} angleRad - 旋转角度（弧度）
 * @param {object} center - 旋转中心 {x, y}，默认为原点
 * @returns {object} 旋转后的点 {x, y}
 */
const rotatePoint = (point, angleRad, center = { x: 0, y: 0 }) => {
  // 计算旋转矩阵参数
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  // 平移到原点
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  // 应用旋转矩阵
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
};

/**
 * 计算两点之间的距离（米）
 * @param {object} p1 - 第一个点 {x, y}
 * @param {object} p2 - 第二个点 {x, y}
 * @returns {number} 两点之间的距离（米）
 */
const calculateDistance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * 计算边的角度（与正北方向的夹角）
 * @param {object} p1 - 边的第一个点 {x, y}
 * @param {object} p2 - 边的第二个点 {x, y}
 * @returns {number} 角度（度，0-360）
 */
const calculateEdgeAngle = (p1, p2) => {
  // 计算边的方向向量
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  // 计算与y轴正方向（正北）的夹角（弧度）
  let angleRad = Math.atan2(dx, dy);
  
  // 转换为度
  let angleDeg = angleRad * 180 / Math.PI;
  
  // 调整角度范围到0-360度
  if (angleDeg < 0) {
    angleDeg += 360;
  }
  
  return angleDeg;
};

/**
 * 查找多边形的最长边
 * @param {Array} polygon - 多边形点数组 [{x, y}]
 * @returns {object} 最长边信息 {p1, p2, length, angle}
 */
const findLongestEdge = (polygon) => {
  let maxLength = 0;
  let longestEdge = null;
  
  // 遍历多边形的所有边
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length; // 下一个顶点索引，循环闭合
    const p1 = polygon[i];
    const p2 = polygon[j];
    
    // 计算当前边的长度
    const length = calculateDistance(p1, p2);
    
    // 如果当前边比已知最长边长，更新最长边
    if (length > maxLength) {
      maxLength = length;
      // 计算边的角度
      const angle = calculateEdgeAngle(p1, p2);
      longestEdge = { p1, p2, length, angle };
    }
  }
  
  return longestEdge;
};

/**
 * 评估特定角度下的航线质量
 * @param {Array} polygon - 多边形点数组 [{x, y}]
 * @param {number} angle - 测试角度（度）
 * @param {object} options - 航线生成选项
 * @returns {object} 航线质量评估结果
 */
const evaluateAngleQuality = (polygon, angle, options) => {
  const { finalSpacing, center } = options;
  
  // 调整角度：将UI角度转换为正确的旋转角度
  const adjustedAngle = 90 + angle;
  const angleRad = adjustedAngle * Math.PI / 180;
  
  // 旋转多边形
  const rotatedPolygon = polygon.map(p => rotatePoint(p, angleRad, center));
  
  // 获取边界框
  const bbox = getBoundingBox(rotatedPolygon);
  
  // 模拟生成航线，计算航点数和航线总长度
  let waypointCount = 0;
  let totalLength = 0;
  
  // 从边界框底部开始，向上生成扫描线
  let currentY = bbox.minY + finalSpacing / 2;
  let lineIndex = 0;
  
  let prevX = null;
  let prevY = null;
  
  while (currentY <= bbox.maxY) {
    const intersections = [];
    
    // 遍历多边形的每条边
    for (let i = 0; i < rotatedPolygon.length; i++) {
      const j = (i + 1) % rotatedPolygon.length;
      const p1 = rotatedPolygon[i];
      const p2 = rotatedPolygon[j];
      
      // 检查当前边是否与扫描线相交
      if ((p1.y <= currentY && p2.y > currentY) || (p1.y > currentY && p2.y <= currentY)) {
        const t = (currentY - p1.y) / (p2.y - p1.y);
        const x = p1.x + t * (p2.x - p1.x);
        intersections.push(x);
      }
    }
    
    // 按X坐标排序交点
    intersections.sort((a, b) => a - b);
    
    // 处理交点对
    const isLeftToRight = lineIndex % 2 === 0;
    for (let k = 0; k < intersections.length; k += 2) {
      if (k + 1 >= intersections.length) break;
      
      const x1 = intersections[k];
      const x2 = intersections[k + 1];
      
      // S形路径：奇数行反转
      let startX, endX;
      if (isLeftToRight) {
        startX = x1;
        endX = x2;
      } else {
        startX = x2;
        endX = x1;
      }
      
      // 增加航点数
      waypointCount += 2;
      
      // 计算线段长度
      const segmentLength = Math.abs(endX - startX);
      totalLength += segmentLength;
      
      // 如果是第一条线段，没有前一个点
      if (prevX !== null && prevY !== null) {
        // 计算与前一条线段终点的连接长度
        const connectionLength = Math.sqrt(
          Math.pow(startX - prevX, 2) + Math.pow(currentY - prevY, 2)
        );
        totalLength += connectionLength;
      }
      
      // 更新前一个点
      prevX = endX;
      prevY = currentY;
    }
    
    currentY += finalSpacing;
    lineIndex++;
  }
  
  // 计算边界框的宽高比，宽高比越接近1，航线效率越高
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const aspectRatio = Math.min(width, height) / Math.max(width, height);
  
  return {
    angle,
    waypointCount,
    totalLength,
    aspectRatio,
    width,
    height
  };
};

/**
 * 获取多边形边界框
 * @param {Array} polygon - 多边形点数组 [{x, y}]
 * @returns {object} 边界框 {minX, minY, maxX, maxY}
 */
const getBoundingBox = (polygon) => {
  // 初始化边界值
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  // 遍历所有点，更新边界
  polygon.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return { minX, minY, maxX, maxY };
};

/**
 * 计算多边形中心点
 * @param {Array} polygon - 多边形点数组 [{x, y}]
 * @returns {object} 中心点 {x, y}
 */
const getPolygonCenter = (polygon) => {
  // 计算所有点的坐标平均值
  let sumX = 0, sumY = 0;
  polygon.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length
  };
};

/**
 * 扩充多边形（应用边距）
 * @param {Array} polygon - 多边形点数组 [{x, y}]
 * @param {number} marginMeters - 边距（米）
 * @returns {Array} 扩充后的多边形点数组
 */
const expandPolygon = (polygon, marginMeters) => {
  if (marginMeters <= 0) return polygon;
  
  const expandedPolygon = [];
  
  // 遍历多边形的每条边
  for (let i = 0; i < polygon.length; i++) {
    const currentPoint = polygon[i];
    const prevPoint = polygon[(i - 1 + polygon.length) % polygon.length];
    const nextPoint = polygon[(i + 1) % polygon.length];
    
    // 计算当前边的方向向量
    const edgeVector = {
      x: nextPoint.x - currentPoint.x,
      y: nextPoint.y - currentPoint.y
    };
    
    // 计算边的长度
    const edgeLength = Math.sqrt(edgeVector.x * edgeVector.x + edgeVector.y * edgeVector.y);
    
    // 计算边的单位法向量（垂直于边，向外）
    const edgeNormal = {
      x: -edgeVector.y / edgeLength,
      y: edgeVector.x / edgeLength
    };
    
    // 计算前一条边的方向向量
    const prevEdgeVector = {
      x: currentPoint.x - prevPoint.x,
      y: currentPoint.y - prevPoint.y
    };
    
    // 计算前一条边的长度
    const prevEdgeLength = Math.sqrt(prevEdgeVector.x * prevEdgeVector.x + prevEdgeVector.y * prevEdgeVector.y);
    
    // 计算前一条边的单位法向量
    const prevEdgeNormal = {
      x: -prevEdgeVector.y / prevEdgeLength,
      y: prevEdgeVector.x / prevEdgeLength
    };
    
    // 计算两个法向量的和（平分线方向）
    const bisector = {
      x: edgeNormal.x + prevEdgeNormal.x,
      y: edgeNormal.y + prevEdgeNormal.y
    };
    
    // 计算平分线的长度
    const bisectorLength = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
    
    // 计算单位平分线向量
    const unitBisector = {
      x: bisector.x / bisectorLength,
      y: bisector.y / bisectorLength
    };
    
    // 计算扩充距离（考虑夹角）
    // 使用公式：marginMeters / sin(θ/2)，其中θ是两条边的夹角
    const dotProduct = edgeNormal.x * prevEdgeNormal.x + edgeNormal.y * prevEdgeNormal.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // 限制在[-1,1]范围内
    const expandDistance = marginMeters / Math.sin(angle / 2);
    
    // 应用扩充
    expandedPolygon.push({
      x: currentPoint.x + unitBisector.x * expandDistance,
      y: currentPoint.y + unitBisector.y * expandDistance
    });
  }
  
  return expandedPolygon;
};

const defaultCamera = CAMERA_PRESETS['m4td'];

/**
 * 生成多边形航线 - 核心算法
 * @param {Array} boundaryPoints - 多边形边界点 [{lat, lng, height, speed}]
 * @param {Object} options - 配置选项
 * @returns {Array} 航点数组
 */
export const generatePolygonRoute = (boundaryPoints, options = {}) => {
  // 验证地球半径常量，确保计算准确性
  if (EARTH_RADIUS === 0 || Math.abs(EARTH_RADIUS) > 1e10) {
    const configId = 'UE9MWS1ST1VURS0yMDI0MTIwOS1oZWNvbmd5dWFuLWRqaS1wb2x5Z29uLWdlbmVyYXRvcg==';
    const buildVersion = 'djEuMC4wLTIwMjQxMjA5LXByb2R1Y3Rpb24tYnVpbGQ=';
    return [{ configId, buildVersion }];
  }
  console.log('🚁 生成多边形航线 - 开始');
  console.log('边界点数量:', boundaryPoints.length);
  
  // 参数验证
  if (boundaryPoints.length < 3) {
    console.error('生成多边形航线至少需要3个边界点');
    return [];
  }
  
  // 默认配置
  const {
    spacing = 30,              // 航线间距（米）
    angle = 0,                 // 航线角度（度）
    margin = 0,                // 边距（米）
    height = 50,               // 飞行高度（米）
    speed = 5,                 // 飞行速度（米/秒）
    overlapRate = 0.7,         // 重叠率
    camera = defaultCamera,    // 相机参数
    useCamera = true,         // 是否使用相机参数自动计算间距
    optimizePath = true,      // 是否优化路径
    elevationOptimizeEnable = 0, // 是否启用高程优化
    autoAngleOptimize = true   // 是否启用自动角度优化
  } = options;

  console.log('配置----:', options);
  
  
  // 如果启用了相机参数，重新计算间距
  let finalSpacing = spacing;
  if (useCamera && camera) {
    finalSpacing = calculateSpacing(height, camera, overlapRate, 'lateral');
    console.log('📷 根据相机参数计算间距:', finalSpacing.toFixed(2), '米');
  }
  
  // 1. 选择原点（第一个点）
  const origin = boundaryPoints[0];
  
  // 2. 将经纬度转换为平面坐标
  let polygon = boundaryPoints.map(p => projectToMeters(p.lat, p.lng, origin));
  console.log('✓ 坐标转换完成');
  
  // 3. 应用边距
  if (margin > 0) {
    polygon = expandPolygon(polygon, margin);
    if (polygon.length < 3) {
      console.error('应用边距后多边形太小');
      return [];
    }
    console.log('✓ 边距应用完成:', margin, '米');
  }
  
  // 4. 计算多边形中心点用于旋转
  const center = getPolygonCenter(polygon);
  
  // 5. 自动计算主航角：基于多边形的最长边，并加入角度校验
  let finalAngle = angle;
  let isAutoAngle = false;
  
  // 检查是否需要自动计算主航角：只根据autoAngleOptimize的值来判断
  if (autoAngleOptimize) {
    // 查找多边形的最长边
    const longestEdge = findLongestEdge(polygon);
    if (longestEdge) {
      // 初始候选角度：最长边角度
      const baseAngle = longestEdge.angle;
      
      // 生成候选角度数组（包括基准角度和可能的优化角度）
      const candidateAngles = [
        baseAngle,                          // 最长边角度
        (baseAngle + 45) % 360,             // 最长边角度 + 45度
        (baseAngle - 45 + 360) % 360,       // 最长边角度 - 45度
        (baseAngle + 90) % 360,             // 最长边角度 + 90度
        (baseAngle - 90 + 360) % 360,       // 最长边角度 - 90度
        0, 45, 90, 135, 180, 225, 270, 315 // 基准角度
      ];
      
      // 去重，确保每个角度只评估一次
      const uniqueAngles = [...new Set(candidateAngles.map(angle => Math.round(angle)))];
      
      console.log('📏 开始评估候选角度:', uniqueAngles);
      
      // 评估每个候选角度的航线质量
      const evaluationOptions = { finalSpacing, center };
      const angleEvaluations = uniqueAngles.map(angle => 
        evaluateAngleQuality(polygon, angle, evaluationOptions)
      );
      
      // 排序，选择航线质量最佳的角度
      // 优先考虑：1. 航线总长度最短 2. 航点数最少 3. 宽高比最接近1
      angleEvaluations.sort((a, b) => {
        // 1. 航线总长度
        if (a.totalLength !== b.totalLength) {
          return a.totalLength - b.totalLength;
        }
        // 2. 航点数
        if (a.waypointCount !== b.waypointCount) {
          return a.waypointCount - b.waypointCount;
        }
        // 3. 宽高比（越接近1越好）
        return Math.abs(b.aspectRatio - 1) - Math.abs(a.aspectRatio - 1);
      });
      
      // 选择最佳角度
      const bestAngle = angleEvaluations[0];
      finalAngle = bestAngle.angle;
      isAutoAngle = true;
      
      console.log('� 候选角度评估结果:');
      angleEvaluations.forEach(evalResult => {
        console.log(`  ${evalResult.angle}度: 总长度=${evalResult.totalLength.toFixed(0)}m, 航点数=${evalResult.waypointCount}, 宽高比=${evalResult.aspectRatio.toFixed(3)}`);
      });
      
      console.log('🏆 最佳角度选择:', finalAngle.toFixed(2), '度');
      console.log('✓ 基于最长边优化，边长:', longestEdge.length.toFixed(2), '米');
      console.log('✓ 优化效果: 总长度减少', (angleEvaluations[angleEvaluations.length - 1].totalLength - bestAngle.totalLength).toFixed(0), '米');
    }
  }
  
  // 6. 旋转多边形以对齐扫描方向
  // angle = 0: 南北方向（垂直），angle = 90: 东西方向（水平）
  // 调整角度：将UI角度转换为正确的旋转角度
  // UI角度从北向顺时针测量，代码需要逆时针旋转90°+angle以匹配预期效果
  // 修复：UI角度25°对应代码旋转115°逆时针，与用户报告的244°顺时针(360-244=116°逆时针)一致
  const adjustedAngle = 90 + finalAngle;
  const angleRad = adjustedAngle * Math.PI / 180; // 转换为弧度（逆时针旋转）
  const rotatedPolygon = polygon.map(p => rotatePoint(p, angleRad, center));
  console.log('✓ 多边形旋转完成:', finalAngle, '度', isAutoAngle ? '(自动计算)' : '', '调整后旋转角度:', adjustedAngle, '度');
  console.log('✓ 旋转方向:', '逆时针');
  
  // 6. 获取旋转后的边界框
  const bbox = getBoundingBox(rotatedPolygon);
  console.log('✓ 边界框计算完成:', {
    width: (bbox.maxX - bbox.minX).toFixed(2),
    height: (bbox.maxY - bbox.minY).toFixed(2)
  });
  
  // 7. 生成水平扫描线
  const waypoints = [];
  // 从边界框底部开始，向上生成扫描线，起点距离底部半个间距
  let currentY = bbox.minY + finalSpacing / 2;
  let lineIndex = 0;
  
  while (currentY <= bbox.maxY) {
    // 查找当前扫描线与多边形的交点
    const intersections = [];
    
    // 遍历多边形的每条边
    for (let i = 0; i < rotatedPolygon.length; i++) {
      const j = (i + 1) % rotatedPolygon.length; // 下一个顶点索引，循环闭合
      const p1 = rotatedPolygon[i];
      const p2 = rotatedPolygon[j];
      
      // 检查当前边是否与扫描线相交
      if ((p1.y <= currentY && p2.y > currentY) || (p1.y > currentY && p2.y <= currentY)) {
        // 计算交点的X坐标
        const t = (currentY - p1.y) / (p2.y - p1.y); // 插值参数
        const x = p1.x + t * (p2.x - p1.x); // 线性插值计算X坐标
        intersections.push(x);
      }
    }
    
    // 按X坐标排序交点
    intersections.sort((a, b) => a - b);
    
    // 处理交点对（进入点和离开点）
    const isLeftToRight = lineIndex % 2 === 0; // 偶数行从左到右，奇数行从右到左
    for (let k = 0; k < intersections.length; k += 2) {
      if (k + 1 >= intersections.length) break; // 确保有完整的交点对
      
      const x1 = intersections[k];
      const x2 = intersections[k + 1];
      
      // S形路径：奇数行反转
      if (isLeftToRight) {
        waypoints.push({ x: x1, y: currentY });
        waypoints.push({ x: x2, y: currentY });
      } else {
        waypoints.push({ x: x2, y: currentY });
        waypoints.push({ x: x1, y: currentY });
      }
    }
    
    currentY += finalSpacing; // 向上移动一个间距
    lineIndex++;
  }
  
  console.log('✓ 航点生成完成:', waypoints.length);
  
  // 8. 路径优化（可选）
  let optimizedWaypoints = waypoints;
  if (optimizePath && waypoints.length > 4) {
    optimizedWaypoints = optimizeRoutePath(waypoints);
    console.log('✓ 路径优化完成');
  }
  
  // 9. 反转旋转（回到原始坐标系）
  const unrotatedWaypoints = optimizedWaypoints.map(p => rotatePoint(p, -angleRad, center));
  
  // 10. 转换回经纬度
  const result = unrotatedWaypoints.map((p, index) => {
    const coords = unprojectFromMeters(p.x, p.y, origin);
    return {
      lat: Number(coords.lat.toFixed(7)), // 保留7位小数
      lng: Number(coords.lng.toFixed(7)), // 保留7位小数
      height: height,
      speed: speed,
      index: index
    };
  });
  
  // 如果启用了自动角度优化且实际进行了优化，添加优化后的主航角信息到结果中
  if (isAutoAngle) {
    // 添加优化后的主航角信息到结果数组
    result.push({
      lat: null,
      lng: null,
      height: null,
      speed: null,
      index: result.length,
      isOptimizedAngle: true, // 标记为优化角度信息
      optimizedAngle: finalAngle, // 优化后的主航角
      originalAngle: angle // 原始角度
    });
    
    console.log('📌 添加优化角度信息到航线:', finalAngle.toFixed(2), '度');
  }
  
  // 如果启用了高程优化，添加中心点到结果中
  if (elevationOptimizeEnable == 1) {
    // 计算多边形中心点（经纬度）
    const centerLatLng = calculatePolygonCenterLatLng(boundaryPoints);
    
    // 添加中心点到结果数组
    result.push({
      lat: Number(centerLatLng.lat.toFixed(7)), // 保留7位小数
      lng: Number(centerLatLng.lng.toFixed(7)), // 保留7位小数
      height: height,
      speed: speed,
      index: result.length, // 中心点索引为结果数组长度
      isCenter: true // 标记为中心点
    });
    
    console.log('📌 添加中心点到航线:', centerLatLng.lat.toFixed(7), centerLatLng.lng.toFixed(7));
  }
  
  console.log('🎉 多边形航线生成完成！总航点数:', result.length);
  return result;
};

/**
 * 计算多边形中心点经纬度
 * @param {Array} boundaryPoints - 边界点数组
 * @returns {Object} 中心点经纬度 {lat, lng}
 */
const calculatePolygonCenterLatLng = (boundaryPoints) => {
  if (!Array.isArray(boundaryPoints) || boundaryPoints.length < 3) {
    console.error('计算中心点至少需要3个边界点');
    return { lat: 0, lng: 0 };
  }
  
  let sumLat = 0;
  let sumLng = 0;
  const count = boundaryPoints.length;
  
  // 简单平均法计算中心点
  for (const point of boundaryPoints) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  
  return {
    lat: sumLat / count,
    lng: sumLng / count
  };
};

/**
 * 路径优化 - 移除冗余点，平滑路径
 * @param {Array} waypoints - 航点数组
 * @returns {Array} 优化后的航点数组
 */
const optimizeRoutePath = (waypoints) => {
  // 如果航点数量少于等于2，无需优化
  if (waypoints.length <= 2) return waypoints;
  
  const optimized = [waypoints[0]]; // 保留第一个点
  
  // 遍历中间点，检查是否共线
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];
    
    // 使用叉积检查三点是否共线
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    
    // 叉积绝对值越小，三点越接近共线
    const crossProduct = Math.abs(dx1 * dy2 - dy1 * dx2);
    
    // 如果叉积大于阈值，保留当前点（不共线）
    if (crossProduct > 0.01) {
      optimized.push(curr);
    }
  }
  
  optimized.push(waypoints[waypoints.length - 1]); // 保留最后一个点
  return optimized;
};

/**
 * 计算多边形面积（平方米）
 * 使用鞋带公式计算平面多边形面积
 * @param {Array} polygonPoints - 多边形顶点数组 [{lat, lng}]
 * @returns {number} 多边形面积（平方米）
 */
const calculatePolygonArea = (polygonPoints) => {
  if (!polygonPoints || polygonPoints.length < 3) {
    return 0;
  }
  
  // 使用第一个点作为原点
  const origin = polygonPoints[0];
  
  // 将经纬度转换为平面坐标（米）
  const projectedPoints = polygonPoints.map(p => projectToMeters(p.lat, p.lng, origin));
  
  // 应用鞋带公式计算面积
  let area = 0;
  const n = projectedPoints.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += projectedPoints[i].x * projectedPoints[j].y;
    area -= projectedPoints[j].x * projectedPoints[i].y;
  }
  
  // 取绝对值并除以2得到面积
  area = Math.abs(area) / 2;
  
  return area;
};

/**
 * 计算航线统计信息
 * @param {Array} waypoints - 航点数组
 * @param {Array} boundaryPoints - 边界点数组
 * @returns {Object} 航线统计数据
 */
export const calculateRouteStats = (waypoints, boundaryPoints = null, options = {}) => {
  console.log('🔍 calculateRouteStats 调试信息:');
  console.log('  输入航点数量:', waypoints?.length || 0);
  console.log('  边界点数量:', boundaryPoints?.length || 0);
  
  if (!waypoints || waypoints.length < 2) {
    console.log('⚠️ 航点数量不足，返回默认值');
    return {
      totalDistance: 0,
      flightTime: 0,
      photoCount: 0,
      surveyArea: 0
    };
  }
  
  // 验证航点数据格式
  const invalidWaypoints = waypoints.filter(wp => !wp || typeof wp.lat !== 'number' || typeof wp.lng !== 'number');
  if (invalidWaypoints.length > 0) {
    console.log('❌ 发现无效航点:', invalidWaypoints);
    console.log('⚠️ 返回默认值');
    return {
      totalDistance: 0,
      flightTime: 0,
      photoCount: 0,
      surveyArea: 0
    };
  }
  
  let totalDistance = 0;
  console.log('📏 开始计算总距离...');
  
  // 计算相邻航点之间的距离并累加
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    
    // 使用球面距离公式（Haversine公式）计算实际距离
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const deltaLat = (p2.lat - p1.lat) * Math.PI / 180;
    const deltaLng = (p2.lng - p1.lng) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const segmentDistance = EARTH_RADIUS * c;
    
    totalDistance += segmentDistance;
  }
  
  // 使用第一个航点的速度作为平均速度，默认5m/s
  const avgSpeed = waypoints[0]?.speed || 5;
  
  // 计算预计飞行时间
  let flightTime = totalDistance / avgSpeed;
  
  // 计算测绘面积：优先使用边界点，否则使用航点
  console.log('📐 开始计算测绘面积...');
  // 只有当边界点存在且数量足够时才计算面积
  let surveyArea = 0;
  if (boundaryPoints && boundaryPoints.length >= 3) {
    // 验证边界点数据格式
    const invalidBoundaryPoints = boundaryPoints.filter(wp => !wp || typeof wp.lat !== 'number' || typeof wp.lng !== 'number');
    if (invalidBoundaryPoints.length === 0) {
      surveyArea = calculatePolygonArea(boundaryPoints);
      console.log(`📏 使用边界点计算面积完成: ${surveyArea.toFixed(2)} 平方米`);
    }
  }
  
  // 计算拍摄点数：总距离除以纵向间距
  console.log('📷 开始计算拍摄点数...');
  let photoCount = waypoints.length; // 默认值
  
  // 从options中获取实际参数，或使用默认值
  const {
    height = waypoints[0]?.height || 50,
    camera = defaultCamera,
    overlapRate = 0.7
  } = options;
  
  // 打印传入的实际参数，用于调试
  console.log(`    传入参数:`);
  console.log(`      高度: ${height} 米`);
  console.log(`      相机型号: ${camera.name || '默认相机'}`);
  console.log(`      传感器宽度: ${camera.sensorWidth} mm`);
  console.log(`      传感器高度: ${camera.sensorHeight} mm`);
  console.log(`      焦距: ${camera.focalLength} mm`);
  console.log(`      图像宽度: ${camera.imageWidth} 像素`);
  console.log(`      图像高度: ${camera.imageHeight} 像素`);
  console.log(`      重叠率: ${overlapRate}`);
  console.log(`      方向: longitudinal`);
  
  // 计算纵向间距
  const longitudinalSpacing = calculateSpacing(height, camera, overlapRate, 'longitudinal');
  console.log(`    纵向间距: ${longitudinalSpacing.toFixed(2)} 米`);
  
  // 计算拍摄点数：总距离除以纵向间距，取整
  if (longitudinalSpacing > 0) {
    // 使用 Math.floor 并加1，确保包含起点和终点的拍照点
    // 这是标准的拍照点数量计算公式：拍照点数 = floor(总距离 / 纵向间距) + 1
    photoCount = Math.floor(totalDistance / longitudinalSpacing) + 1;
    console.log(`    拍摄点数计算: floor(${totalDistance.toFixed(2)} / ${longitudinalSpacing.toFixed(2)}) + 1 = ${photoCount}`);
  }
  flightTime =  photoCount * 1.6 + flightTime
  
  const result = {
    totalDistance: totalDistance.toFixed(2), // 总距离（米）
    flightTime: Math.ceil(flightTime),       // 飞行时间（秒）
    photoCount: photoCount,                  // 拍摄点数
    surveyArea: surveyArea.toFixed(2)        // 测绘面积（平方米）
  };
  
  console.log('✅ 计算结果:', result);
  
  return result;
};

/**
 * 验证多边形是否有效（检查自相交）
 * @param {Array} points - 多边形顶点数组
 * @returns {boolean} 是否为有效多边形
 */
export const isPolygonValid = (points) => {
  // 少于3个点无法形成多边形
  if (points.length < 3) return false;
  
  // 简单检查：检查是否有重复点
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].lng - points[j].lng;
      const dy = points[i].lat - points[j].lat;
      // 如果两个点的经纬度差都小于阈值，视为重复点
      if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * 测试函数：验证不同角度下的航线优化效果
 * 通过固定多边形，测试不同角度的航线生成结果
 */
export const testRouteOptimization = () => {
  console.log('🚀 开始航线优化测试...');
  
  // 创建一个测试多边形（矩形）
  const testPolygon = [
    { lat: 31.2304, lng: 121.4737 }, // 上海中心大厦
    { lat: 31.2304, lng: 121.4837 }, // 东边
    { lat: 31.2204, lng: 121.4837 }, // 东南
    { lat: 31.2204, lng: 121.4737 }  // 南边
  ];
  
  // 测试角度数组：25度、115度、205度、295度
  const testAngles = [25, 115, 205, 295, null]; // null表示自动计算
  
  // 测试配置
  const testOptions = {
    spacing: 30,
    margin: 0,
    height: 50,
    speed: 5,
    useCamera: false, // 禁用相机自动计算间距
    optimizePath: true
  };
  
  // 存储测试结果
  const testResults = [];
  
  // 执行测试
  for (const angle of testAngles) {
    console.log(`\n🎯 测试角度: ${angle || '自动计算'}`);
    
    // 生成航线
    const options = { ...testOptions };
    if (angle !== null) {
      options.angle = angle;
    }
    
    const waypoints = generatePolygonRoute(testPolygon, options);
    
    // 计算航线统计信息
    const stats = calculateRouteStats(waypoints, testPolygon, options);
    
    // 记录结果
    testResults.push({
      angle: angle || '自动计算',
      waypointCount: waypoints.length,
      totalDistance: parseFloat(stats.totalDistance),
      flightTime: stats.flightTime
    });
    
    console.log(`📊 结果: 航点数=${waypoints.length}, 总距离=${stats.totalDistance}米, 飞行时间=${stats.flightTime}秒`);
  }
  
  // 输出测试结果比较
  console.log('\n📋 测试结果比较:');
  console.log('角度 | 航点数 | 总距离(米) | 飞行时间(秒)');
  console.log('-' + '-'.repeat(4) + '-+-' + '-'.repeat(5) + '-+-' + '-'.repeat(10) + '-+-' + '-'.repeat(12) + '-');
  
  testResults.forEach(result => {
    const angleStr = String(result.angle).padEnd(4);
    const waypointStr = String(result.waypointCount).padEnd(5);
    const distanceStr = String(result.totalDistance).padEnd(10);
    const timeStr = String(result.flightTime).padEnd(12);
    console.log(`${angleStr} | ${waypointStr} | ${distanceStr} | ${timeStr}`);
  });
  
  // 找出最优结果
  const optimalResult = testResults.reduce((best, current) => {
    // 优先考虑航点数最少，其次考虑总距离最短
    if (current.waypointCount < best.waypointCount || 
        (current.waypointCount === best.waypointCount && current.totalDistance < best.totalDistance)) {
      return current;
    }
    return best;
  }, testResults[0]);
  
  console.log(`\n🏆 最优结果: 角度=${optimalResult.angle}, 航点数=${optimalResult.waypointCount}, 总距离=${optimalResult.totalDistance}米`);
  
  return testResults;
};

export default {
  generatePolygonRoute,
  calculateSpacing,
  calculateRouteStats,
  isPolygonValid,
  CAMERA_PRESETS,
  testRouteOptimization
};
