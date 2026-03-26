import * as Cesium from 'cesium'
import {
  Viewer,
  Cartesian3,
  PerspectiveFrustum,
  Ion,
  WebMapTileServiceImageryProvider,
  DebugCameraPrimitive,
  Color,
  Cartographic,
  ScreenSpaceEventType,
  Camera,
  SceneMode,
  Math as cesiumMath,
  HeadingPitchRoll,
  createWorldTerrainAsync,
  EllipsoidTerrainProvider,
  ArcGISTiledElevationTerrainProvider,
  Transforms,
  Quaternion,
  defined,
  FrustumGeometry,
  FrustumOutlineGeometry,
  VertexFormat,
  GeometryInstance,
  ColorGeometryInstanceAttribute,
  Primitive,
  PerInstanceColorAppearance,
  Matrix4,
  ClassificationType
} from 'cesium'
import Drone from "@/assets/svgs/yaw-mode-drone.svg";

/**
 * 根据大疆相机镜头参数 计算出cesium 的fov
 * @param focalLength  焦距
 * @param zoomFactor  变焦倍速
 * @param sensorHeight  传感器高度
 * @param distortionFactor  广角镜头需应用桶形畸变校正
 * @param pixelPitch 高分辨率传感器需考虑像素密度
 * @returns
 */
export function getCesiumFovFromCameraSpecifications(focalLength = 6.7, zoomFactor = 1, sensorHeight = 24, distortionFactor = 1, pixelPitch = 0) {
  const effectiveFocalLength = focalLength * zoomFactor;
  const commonVerticalFOV = 2 * Math.atan(sensorHeight / (2 * effectiveFocalLength));
  const wideAngleLensVerticalFOV = commonVerticalFOV * distortionFactor;
  const highResolutionVerticalFOV = wideAngleLensVerticalFOV * (1 - pixelPitch / 1000);
  return cesiumMath.toDegrees(highResolutionVerticalFOV).toFixed(2);
}

/**
 * 根据zoom值计算fov
 * @param {number} fovMax - 最大fov值（zoom=1时）
 * @param {number} fovMin - 最小fov值（zoom=maxZoom时）
 * @param {number} zoom - 当前zoom值
 * @param {number} [maxZoom=112] - 最大zoom值
 * @returns {number} 计算后的fov值
 */
export function calculateFovFromZoom(fovMax, fovMin, zoom, maxZoom = 112) {
  // 确保zoom在有效范围内
  const clampedZoom = Math.max(1, Math.min(zoom, maxZoom));
  
  // 线性映射：zoom从1到maxZoom，fov从fovMax到fovMin
  const fovRange = fovMax - fovMin;
  const zoomRange = maxZoom - 1;
  const normalizedZoom = (clampedZoom - 1) / zoomRange;
  const calculatedFov = fovMax - normalizedZoom * fovRange;
  
  // 确保fov在有效范围内
  return Math.max(fovMin, Math.min(fovMax, calculatedFov));
}

/**
 * 根据zoom值计算fov（对数映射，更符合人眼感知）
 * @param {number} fovMax - 最大fov值（zoom=1时）
 * @param {number} fovMin - 最小fov值（zoom=maxZoom时）
 * @param {number} zoom - 当前zoom值
 * @param {number} [maxZoom=112] - 最大zoom值
 * @returns {number} 计算后的fov值
 */
export function calculateFovFromZoomLog(fovMax, fovMin, zoom, maxZoom = 112) {
  // 确保zoom在有效范围内
  const clampedZoom = Math.max(1, Math.min(zoom, maxZoom));
  
  // 对数映射：zoom从1到maxZoom，fov从fovMax到fovMin
  const logZoom = Math.log(clampedZoom);
  const logMaxZoom = Math.log(maxZoom);
  const normalizedZoom = logZoom / logMaxZoom;
  const calculatedFov = fovMax - normalizedZoom * (fovMax - fovMin);
  
  // 确保fov在有效范围内
  return Math.max(fovMin, Math.min(fovMax, calculatedFov));
}

// 将大疆角度转换为Cesium HeadingPitchRoll
export function convertDjiToCesiumAngles(yaw, pitch) {
  // 角度转弧度
  const radYaw = cesiumMath.toRadians(yaw);
  const radPitch = cesiumMath.toRadians(pitch);
  // 返回正确的HeadingPitchRoll对象，而不是普通对象
  return new HeadingPitchRoll(radYaw, radPitch, 0);
}

// 将数据处理成可以直接使用的
export function getCesiumHPRFromDjiSpecifications(position, yaw = 0, pitch = 0, gimbalRoll = 0) {
  // 确保position是有效的Cartesian3
  if (!Cartesian3.isCartesian3(position)) {
    console.error('Invalid position in getCesiumHPRFromDjiSpecifications:', position);
    return Quaternion.IDENTITY;
  }
  
  // 检查position是否包含NaN值
  if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
    console.error('Position contains NaN values in getCesiumHPRFromDjiSpecifications:', position);
    return Quaternion.IDENTITY;
  }
  
  const orientation = convertDjiToCesiumAngles(yaw, pitch);
  
  try {
    // 直接使用HPR旋转，不再应用额外的修正旋转，确保与线框使用相同的旋转逻辑
    return Transforms.headingPitchRollQuaternion(position, orientation);
  } catch (error) {
    console.error('Error in getCesiumHPRFromDjiSpecifications:', error);
    return Quaternion.IDENTITY;
  }
}


/**
 * 绘制无人机箭头【带方向】
 */
export class createDroneArrowEntity {
  private viewer: any;
  private _position: any;
  private _yaw: any;
  private _pitch: any;
  private _roll: any;
  private _droneArrowEntity: any;
  constructor(viewer, options) {
    this.viewer = viewer;
    this.update(options);
  }
  update(options) {
    this._position = options.position;
    this._yaw = options.yaw;
    this._pitch = options.pitch;
    this._roll = -options.roll;
    this._add();
  }

  _add() {
    this.clear();
    const cesiumHeading = cesiumMath.toRadians(this._yaw); // 0=正东
    this._droneArrowEntity = this.viewer.entities.add({
      position: this._position,
      billboard: {
        image: Drone,
        width: 30,
        height: 30,
        rotation: -cesiumHeading,
        alignedAxis: Cartesian3.UNIT_Z,
        scale: 1.0,
      },
      orientation: getCesiumHPRFromDjiSpecifications(this._position, this._yaw, this._pitch),
    });
  }

  clear() {
    if (this._droneArrowEntity) {
      this.viewer.entities.remove(this._droneArrowEntity);
      this._droneArrowEntity = null;
    }
  }
}


/**
 * 绘制视锥
 */
export class CreateFrustum {
  viewer;
  _position;
  _yaw: any;
  _pitch: any;
  _roll: any;
  _fov: number;
  _near: number;
  _far: number;
  _fill: boolean;
  _closed: boolean;
  _color: Color;
  _outlineColor: Color;
  _flat: boolean;
  _frustum: any;
  _frustumPrimitive: any;
  _outlinePrimitive: any;
  _aspectRatio: number;

  constructor(viewer, options) {
    this.viewer = viewer;
    this._position = options.position;
    this._yaw = options.yaw;
    this._pitch = options.pitch;
    this._roll = options.roll;
    this._aspectRatio = options.aspectRatio || 4/3; // DJI Matrice 4TD相机宽高比：4:3
    this._fov = options.fov || 82.0; // DJI Matrice 4TD默认视角（DFOV）：82°
    this._near = options.near || 1.0; // DJI Matrice 4TD默认对焦点：1米
    this._far = options.far || 200;
    this._fill = options.fill || false;
    this._closed = options.closed || false;
    this._color = options.color || new Color(0.0, 1.0, 0.0, 0.2);
    this._outlineColor = options.outlineColor || new Color(0.0, 1.0, 0.0, 0.5);
    this._flat = options.flat || true;

    this.update(this._position, this._yaw, this._pitch, this._fov, this._far);
  }

  update(position, yaw, pitch, fov, far) {
    this._position = position;
    this._yaw = yaw;
    this._pitch = pitch;
    this._fov = fov;
    this._far = far;
    this._add();
  }

  // 将经纬度高度对象转换为Cartesian3
  _convertToCartesian3(position) {
    // 检查是否已经是Cartesian3实例
    if (position instanceof Cartesian3 || (typeof position === 'object' && position.x !== undefined && position.y !== undefined && position.z !== undefined)) {
      return position;
    }
    // 如果是经纬度高度对象，转换为Cartesian3
    if (position.lng !== undefined && position.lat !== undefined) {
      return Cartesian3.fromDegrees(
        position.lng,
        position.lat,
        position.height || 0
      );
    }
    // 如果是longitude/latitude对象，转换为Cartesian3
    if (position.longitude !== undefined && position.latitude !== undefined) {
      return Cartesian3.fromDegrees(
        position.longitude,
        position.latitude,
        position.height || 0
      );
    }
    return Cartesian3.ZERO;
  }

  _add() {
    this.clear();
    // 先计算顶点，然后同时用于面和线的生成
    const vertices = this._calculateVertices();
    this._addFrustum(vertices);
    this._addOutline(vertices);
  }
  
  // 统一计算顶点，用于面和线的生成
  _calculateVertices() {
    if (!defined(this._position)) {
      return null;
    }
    
    // 将位置转换为Cartesian3
    const cartesianPosition = this._convertToCartesian3(this._position);
    
    // 检查转换后的位置是否有效
    if (isNaN(cartesianPosition.x) || isNaN(cartesianPosition.y) || isNaN(cartesianPosition.z)) {
      return null;
    }
    
    // 计算四棱锥体的顶点位置
    const fovRad = cesiumMath.toRadians(this._fov);
    const near = this._near;
    const far = this._far;
    const aspectRatio = this._aspectRatio;
    
    // 计算近裁剪面和远裁剪面的高度和宽度
    const nearHeight = 2.0 * Math.tan(fovRad / 2.0) * near;
    const nearWidth = nearHeight * aspectRatio;
    const farHeight = 2.0 * Math.tan(fovRad / 2.0) * far;
    const farWidth = farHeight * aspectRatio;
    
    // 计算近裁剪面的四个顶点 (局部坐标系)
    const nearTopLeft = new Cartesian3(-nearWidth / 2, nearHeight / 2, -near);
    const nearTopRight = new Cartesian3(nearWidth / 2, nearHeight / 2, -near);
    const nearBottomRight = new Cartesian3(nearWidth / 2, -nearHeight / 2, -near);
    const nearBottomLeft = new Cartesian3(-nearWidth / 2, -nearHeight / 2, -near);
    
    // 计算远裁剪面的四个顶点 (局部坐标系)
    const farTopLeft = new Cartesian3(-farWidth / 2, farHeight / 2, -far);
    const farTopRight = new Cartesian3(farWidth / 2, farHeight / 2, -far);
    const farBottomRight = new Cartesian3(farWidth / 2, -farHeight / 2, -far);
    const farBottomLeft = new Cartesian3(-farWidth / 2, -farHeight / 2, -far);
    
    // 创建变换矩阵
    const hpr = new HeadingPitchRoll(
      cesiumMath.toRadians(this._yaw),
      cesiumMath.toRadians(this._pitch),
      0
    );
    const transform = Transforms.headingPitchRollToFixedFrame(cartesianPosition, hpr);
    
    // 将顶点从局部坐标系转换到世界坐标系
    const transformVertex = (vertex) => {
      const result = new Cartesian3();
      return Matrix4.multiplyByPoint(transform, vertex, result);
    };
    
    // 转换所有顶点
    return {
      worldNearTopLeft: transformVertex(nearTopLeft),
      worldNearTopRight: transformVertex(nearTopRight),
      worldNearBottomRight: transformVertex(nearBottomRight),
      worldNearBottomLeft: transformVertex(nearBottomLeft),
      worldFarTopLeft: transformVertex(farTopLeft),
      worldFarTopRight: transformVertex(farTopRight),
      worldFarBottomRight: transformVertex(farBottomRight),
      worldFarBottomLeft: transformVertex(farBottomLeft)
    };
  }

  clear() {
    this._clearFrustum();
    this._clearOutline();
  }
  _addFrustum(vertices) {
    if (!vertices) {
      return;
    }
    if (!defined(this.viewer)) {
      return;
    }
    
    // 如果需要填充，创建四棱锥体的各个面
    if (this._fill) {
      // 使用统一计算的顶点创建四棱锥体的所有面（1个底面和4个侧面）
      const { worldNearTopLeft, worldNearTopRight, worldNearBottomRight, worldNearBottomLeft, worldFarTopLeft, worldFarTopRight, worldFarBottomRight, worldFarBottomLeft } = vertices;
      
      // 创建四棱锥体的所有面
      const frustumFaces = [
        // 左面：连接近左边缘和远左边缘 - 逆时针顶点顺序
        {
          positions: [worldNearTopLeft, worldFarTopLeft, worldFarBottomLeft, worldNearBottomLeft],
          material: this._color
        },
        // 右面：连接近右边缘和远右边缘 - 逆时针顶点顺序
        {
          positions: [worldNearTopRight, worldNearBottomRight, worldFarBottomRight, worldFarTopRight],
          material: this._color
        },
        // 底面：连接近底面和远底面 - 逆时针顶点顺序
        {
          positions: [worldNearBottomLeft, worldNearBottomRight, worldFarBottomRight, worldFarBottomLeft],
          material: this._color
        },
        // 前面：连接近面和远面的前边缘 - 逆时针顶点顺序
        {
          positions: [worldNearTopLeft, worldNearTopRight, worldFarTopRight, worldFarTopLeft],
          material: this._color
        },
        // 后面：连接近面和远面的后边缘 - 逆时针顶点顺序
        {
          positions: [worldNearBottomLeft, worldFarBottomLeft, worldFarBottomRight, worldNearBottomRight],
          material: this._color
        }
      ];
      
      // 添加所有面到viewer
      this._frustumPrimitive = [];
      frustumFaces.forEach((face, index) => {
        this._frustumPrimitive.push(
          this.viewer.entities.add({
            polygon: {
              hierarchy: face.positions,
              material: face.material,
              outline: false,
              classificationType: ClassificationType.BOTH,
              // 启用背面剔除，确保面的正确渲染
              backFaceCulling: true
            }
          })
        );
      });
    }
  }

  // 创建轮廓线
  _addOutline(vertices) {
    if (!vertices) {
      return;
    }
    if (!defined(this.viewer)) {
      return;
    }
    
    // 使用统一计算的顶点创建轮廓线
    const { worldNearTopLeft, worldNearTopRight, worldNearBottomRight, worldNearBottomLeft, worldFarTopLeft, worldFarTopRight, worldFarBottomRight, worldFarBottomLeft } = vertices;
    
    // 创建轮廓线
    const outlinePositions = [
      // 近平面轮廓
      worldNearTopLeft, worldNearTopRight,
      worldNearTopRight, worldNearBottomRight,
      worldNearBottomRight, worldNearBottomLeft,
      worldNearBottomLeft, worldNearTopLeft,
      
      // 远平面轮廓
      worldFarTopLeft, worldFarTopRight,
      worldFarTopRight, worldFarBottomRight,
      worldFarBottomRight, worldFarBottomLeft,
      worldFarBottomLeft, worldFarTopLeft,
      
      // 连接近远平面
      worldNearTopLeft, worldFarTopLeft,
      worldNearTopRight, worldFarTopRight,
      worldNearBottomRight, worldFarBottomRight,
      worldNearBottomLeft, worldFarBottomLeft
    ];
    
    // 使用实体创建轮廓线
    this._outlinePrimitive = this.viewer.entities.add({
      polyline: {
        positions: outlinePositions,
        width: 1.0,
        material: this._outlineColor,
        clampToGround: false
      }
    });
  }

  _clearFrustum() {
    if (this._frustumPrimitive) {
      // 如果是数组，遍历移除所有实体
      if (Array.isArray(this._frustumPrimitive)) {
        this._frustumPrimitive.forEach(primitive => {
          this.viewer.entities.remove(primitive);
        });
      } else {
        // 检查是primitive还是entity
        if (this.viewer.scene.primitives.contains(this._frustumPrimitive)) {
          this.viewer.scene.primitives.remove(this._frustumPrimitive);
        } else {
          this.viewer.entities.remove(this._frustumPrimitive);
        }
      }
      this._frustumPrimitive = null;
    }
  }

  // 清除轮廓线
  _clearOutline() {
    if (this._outlinePrimitive) {
      // 检查是primitive还是entity
      if (this.viewer.scene.primitives.contains(this._outlinePrimitive)) {
        this.viewer.scene.primitives.remove(this._outlinePrimitive);
      } else {
        this.viewer.entities.remove(this._outlinePrimitive);
      }
      this._outlinePrimitive = null;
    }
  }
}


// 大疆偏航角转Cesium航向角
export const djiYawToCesiumHeading = (djiYaw: number) => {
    // 大疆通常是北为0度，顺时针为正
    // Cesium是东为0度，逆时针为正
    
    // 方法1：直接转换
    let cesiumHeading = -djiYaw * Math.PI / 180; // 转为弧度并取反
    
    // 方法2：如果需要坐标系对齐
    // let cesiumHeading = (90 - djiYaw) * Math.PI / 180;
    
    // 确保角度在0-2π范围内
    cesiumHeading = cesiumHeading % (2 * Math.PI);
    if (cesiumHeading < 0) {
        cesiumHeading += 2 * Math.PI;
    }
    
    return cesiumHeading;
}

/**
 * 从航点中提取偏航角动作并转换为Cesium航向角
 * @param selectedWaypoint 选中的航点
 * @param ActionType 动作类型枚举（可选）
 * @returns Cesium旋转角度（弧度），如果没有找到偏航角动作则返回null
 */
export const extractYawFromWaypoint = (selectedWaypoint: any ,ActionType: any) => {
  // 检查selectedWaypoint是否包含偏航角动作
  if (selectedWaypoint && 
      selectedWaypoint.actionGroupList && 
      selectedWaypoint.actionGroupList.length > 0) {
    
    // 遍历所有actionGroupList中的actions，找到所有偏航角动作
    let yawActions = [];
    selectedWaypoint.actionGroupList.forEach(group => {
      if (group.actions && Array.isArray(group.actions)) {
        // 找到所有偏航角相关的动作
        const groupYawActions = group.actions.filter(action => {
          // 根据ActionType参数或字符串匹配找到偏航角动作
          return action.type === ActionType.YAW ;
        });
        yawActions = [...yawActions, ...groupYawActions];
      }
    });
    
    // 如果有偏航角动作，使用最后一个动作的数值
    if (yawActions.length > 0) {
      const lastYawAction = yawActions[yawActions.length - 1];
      // 获取偏航角数值
      const yawValue = lastYawAction.value || lastYawAction.aircraftHeading || 0;
      
      // 使用djiYawToCesiumHeading方法转换
      return yawValue;
    }
  }
  
  // 如果没有找到偏航角动作，返回null
  return null;
};


/**
 * 从航点中提取动作值
 * @param selectedAction 选中的动作
 * @param selectedActionIndex 选中动作在当前组中的索引
 * @param selectedWaypoint 选中的航点
 * @param waypoints 航点列表
 * @param ActionType 动作类型枚举
 * @returns 俯仰角值，如果没有找到动作则返回0
 */
export const extractActionFromWaypoint = (selectedAction: any, selectedActionIndex: number, selectedWaypoint: any, waypoints: any[], ActionType: any) => {
  // 确保ActionType有效
  if (!ActionType) {
    console.error('ActionType is required');
    return 0;
  }

  // 1. 检查当前选中的动作是否是目标类型动作
  if (selectedAction) {
    const isTargetAction = selectedAction.type === ActionType;
    
    if (isTargetAction) {
      // 返回动作值
      return selectedAction.value || 0;
    }
  }

  // 2. 检查当前选中航点中，选中动作之前的动作是否存在目标类型动作
  let currentWaypointTargetActions: any[] = [];
  
  if (selectedWaypoint && selectedWaypoint.actionGroupList && Array.isArray(selectedWaypoint.actionGroupList)) {
    // 遍历所有动作组，找到包含当前选中动作的组
    let currentGroupIndex = -1;
    for (let i = 0; i < selectedWaypoint.actionGroupList.length; i++) {
      const group = selectedWaypoint.actionGroupList[i];
      if (group.actions && Array.isArray(group.actions) && group.actions.includes(selectedAction)) {
        currentGroupIndex = i;
        break;
      }
    }
    
    // 收集当前航点中选中动作之前的所有目标类型动作
    for (let i = 0; i < selectedWaypoint.actionGroupList.length; i++) {
      const group = selectedWaypoint.actionGroupList[i];
      if (group.actions && Array.isArray(group.actions)) {
        if (i === currentGroupIndex) {
          // 只检查当前组中选中动作之前的动作
          const actionsBeforeSelected = group.actions.slice(0, selectedActionIndex);
          const groupTargetActions = actionsBeforeSelected.filter(action => {
            return action.type === ActionType ;
          });
          currentWaypointTargetActions = [...currentWaypointTargetActions, ...groupTargetActions];
          break; // 已经处理到当前组，后续组不处理
        } else {
          // 处理当前组之前的所有组的所有动作
          const groupTargetActions = group.actions.filter(action => {
            return action.type === ActionType ;
          });
          currentWaypointTargetActions = [...currentWaypointTargetActions, ...groupTargetActions];
        }
      }
    }
  }
  
  // 如果当前航点中找到目标类型动作，返回最后一个的值
  if (currentWaypointTargetActions.length > 0) {
    const lastTargetAction = currentWaypointTargetActions[currentWaypointTargetActions.length - 1];
    return lastTargetAction.value || 0;
  }
  
  // 3. 向选中航点的上一个航点进行遍历，查找目标类型动作
  let previousWaypointTargetActions: any[] = [];
  
  if (Array.isArray(waypoints) && waypoints.length > 0) {
    // 找到当前航点在waypoints数组中的索引
    const currentWaypointIndex = waypoints.findIndex(wp => wp.id === selectedWaypoint.id);
    
    if (currentWaypointIndex > 0) {
      // 遍历当前航点之前的所有航点（从近到远）
      for (let i = currentWaypointIndex - 1; i >= 0; i--) {
        const prevWaypoint = waypoints[i];
        if (prevWaypoint && prevWaypoint.actionGroupList && Array.isArray(prevWaypoint.actionGroupList)) {
          // 遍历上一个航点的所有动作组和动作
          prevWaypoint.actionGroupList.forEach(group => {
            if (group.actions && Array.isArray(group.actions)) {
              const groupTargetActions = group.actions.filter(action => {
                return action.type === ActionType;
              });
              previousWaypointTargetActions = [...previousWaypointTargetActions, ...groupTargetActions];
            }
          });
          
          // 如果找到目标类型动作，停止遍历，返回最后一个的值
          if (previousWaypointTargetActions.length > 0) {
            const lastTargetAction = previousWaypointTargetActions[previousWaypointTargetActions.length - 1];
            return lastTargetAction.value || 0;
          }
        }
      }
    }
  }
  
  // 4. 如果所有航点都没有动作，返回默认值0
  return 0;
};
/**
 * 计算无人机旋转角度
 * @param selectedWaypoint 选中的航点
 * @param waypoints 航点列表
 * @param isClosedLoop 是否为闭环航线
 * @returns Cesium旋转角度（弧度）
 */
export const calculateDroneRotation = (selectedWaypoint: any, waypoints: any[], isClosedLoop: boolean = false) => {
  try {
    if (!selectedWaypoint || !Array.isArray(waypoints) || waypoints.length < 2) {
      return 0;
    }
    
    // 找到当前选中航点在waypoints数组中的索引，使用更宽松的比较方式
    const currentIndex = waypoints.findIndex(wp => 
      String(wp.id) === String(selectedWaypoint.id)
    );
    
    // 如果找不到航点，返回0
    if (currentIndex === -1) {
      return 0;
    }
    
    // 获取当前航点和下一个航点的经纬度数据
    const currentWaypoint = selectedWaypoint;
    
    // 计算下一个航点的索引：如果是最后一个航点且是闭环，则下一个为第一个航点；否则为下一个航点
    const hasNextWaypoint = currentIndex < waypoints.length - 1;
    const shouldUseNextWaypoint = hasNextWaypoint || isClosedLoop;
    
    // 如果没有下一个航点且不是闭环，返回0
    if (!shouldUseNextWaypoint) {
      return 0;
    }
    
    const nextIndex = hasNextWaypoint ? currentIndex + 1 : 0;
    const nextWaypoint = waypoints[nextIndex];
    
    // 确保两个航点都有有效的经纬度数据
    if (!currentWaypoint || !nextWaypoint) {
      return 0;
    }
    
    // 获取经纬度值，处理不同的数据字段名
    const currLng = currentWaypoint.lng || currentWaypoint.longitude;
    const currLat = currentWaypoint.lat || currentWaypoint.latitude;
    const nextLng = nextWaypoint.lng || nextWaypoint.longitude;
    const nextLat = nextWaypoint.lat || nextWaypoint.latitude;
    
    // 检查经纬度数据是否有效
    if (typeof currLng !== 'number' || typeof currLat !== 'number' ||
        typeof nextLng !== 'number' || typeof nextLat !== 'number') {
      return 0;
    }
    
    // 计算两个航点之间的方位角（地理方位角：0度=北，90度=东，180度=南，270度=西，顺时针为正）
    // 参考：https://www.movable-type.co.uk/scripts/latlong.html
    const φ1 = currLat * Math.PI / 180;
    const φ2 = nextLat * Math.PI / 180;
    const Δλ = (nextLng - currLng) * Math.PI / 180;
    
    // 使用Haversine公式计算方位角（弧度，范围-π到π）
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - 
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    
    // 将地理方位角转换为大疆标准的yaw格式（以北为0度，顺时针为正，范围0-360度）
    // 地理方位角（弧度）转换为角度，范围-180到180度
    let geodeticBearingDeg = θ * 180 / Math.PI;
    
    // 转换为0-360度范围
    if (geodeticBearingDeg < 0) {
      geodeticBearingDeg += 360;
    }
    
    // 使用djiYawToCesiumHeading方法将大疆yaw转换为Cesium旋转角度
    return geodeticBearingDeg;
  } catch (error) {
    console.error('计算无人机偏航角时出错:', error);
    return 0;
  }
}


