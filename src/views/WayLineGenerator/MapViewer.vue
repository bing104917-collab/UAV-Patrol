<template>
  <div
    class="relative w-full h-full"
    @contextmenu.prevent="onRightClick"
    @click="onLeftClick"
  >
    <vc-viewer
      class="w-full h-full block"
      @ready="onViewerReady"
      :camera="camera"
      :animation="false"
      :timeline="false"
      :showCredit="false"
      :base-layer-picker="false"
      
      @map-click="onMapClick"
    >
      <!-- 选择指示器 -->
      <vc-selection-indicator ref="selectionIndicator" @pick-evt="pickEvt" />
      <!-- 天地图地形 -->
      <!-- <vc-terrain-provider-tianditu ref="provider" token="6519adb5c95e116ccef862284932b551" @ready="onTerrainReady"/> -->

      <vc-layer-imagery :sort-order="1">
        <vc-imagery-provider-urltemplate
          url="https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
          :minimum-level="0"
          :maximum-level="20"
        />
      </vc-layer-imagery>

      <vc-layer-imagery :sort-order="2">
        <vc-imagery-provider-urltemplate
          url="https://wprd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=8&x={x}&y={y}&z={z}"
          :minimum-level="0"
          :maximum-level="20"
        />
      </vc-layer-imagery>

      <vc-navigation />
       <!-- 起飞点 - 默认图标 -->
        
      <vc-entity
        v-if="takeoffPointObj"
        :position="takeoffPointObj"
        :billboard="{
          image: TakeOffPointMap,
          fill: 'white',
          scale: 1.0,
          horizontalOrigin: 0,
          verticalOrigin: 0,
          width: 36,
          height: 36,
          // 设置zIndex来确保billboard显示在point上方
          zIndex: 100,
        }"
        :label="{
          text: '起飞点',
          font: '14px sans-serif',
          pixelOffset: [0, -20],
          horizontalOrigin: 0,
          verticalOrigin: 1,
          fillColor: 'white',
          outlineColor: 'black',
          outlineWidth: 2,
        }"
      />

      <!-- Takeoff Point to First Waypoint Line -->
      <vc-entity v-if="takeoffToWaypointPositions.length >= 2">
        <vc-graphics-polyline
          :positions="takeoffToWaypointPositions"
          :material="'#09ed8b'"
          :width="2"
          :dash-pattern="[5, 5]"
        />
      </vc-entity>

      <!-- 航点 Waypoints (User Clicks) -->
      <vc-entity
        v-for="(wp, index) in waypoints"
        :key="'wp-' + index"
        :position="{
          lng: wp.lng || wp.longitude,
          lat: wp.lat || wp.latitude,
          height: wp.height,
        }"
        :point="pointGraphics"
        :label="{
          text: (index + 1).toString(),
          font: '14px sans-serif',
          pixelOffset: [0, -20],
          horizontalOrigin: 0,
          verticalOrigin: 1,
          fillColor: 'white',
          outlineColor: 'black',
          outlineWidth: 2,
        }"
      />

      <!-- 无人机 Drone Layer - Displayed above selected waypoint -->
      
      <vc-entity
        v-if="selectedWaypoint && !isPatrolMode"
        :key="'drone-' + selectedWaypoint.id"
        :position="{
          lng: selectedWaypoint.lng || selectedWaypoint.longitude,
          lat: selectedWaypoint.lat || selectedWaypoint.latitude,
          height: selectedWaypoint.height + 2 || 0,
        }"
        :orientation="droneOrientation"
        :model="{
            show:true,
            uri: DroneModelUrl,
            scale: 1,
            zIndex: 150,
            
          }"
      />
          <!-- 
            :model="{
            show:true,
            uri: DroneModelUrl,
            scale: 1,
            zIndex: 150,
            orientation: droneRotation,
          }" 
          -->

      <!-- 垂地线 - 黄色实线 -->
      <vc-entity v-if="selectedWaypoint && !isPatrolMode">
        <vc-graphics-polyline
          :positions="[
            {
              lng: selectedWaypoint.lng || selectedWaypoint.longitude,
              lat: selectedWaypoint.lat || selectedWaypoint.latitude,
              height: selectedWaypoint.height -20 || 0,
            },
            {
              lng: selectedWaypoint.lng || selectedWaypoint.longitude,
              lat: selectedWaypoint.lat || selectedWaypoint.latitude,
              height: 0,
            },
          ]"
          
          :clampToGround="false"
          :material="'#f1c40f'"
          :width="3"
          :zIndex="999"
        />
      </vc-entity>

      <!-- 黄色圆形 - 地面标记 -->
      <vc-entity v-if="selectedWaypoint && !isPatrolMode">
        <vc-graphics-point
          :position="{
            lng: selectedWaypoint.lng || selectedWaypoint.longitude,
            lat: selectedWaypoint.lat || selectedWaypoint.latitude,
            height: 0,
          }"
          :pixelSize="10"
          :color="'#f1c40f'"
          :outlineColor="'#d35400'"
          :outlineWidth="2"
          :zIndex="998"
        />
      </vc-entity>

      <!-- Polygon Area (Patrol Mode) -->
      <vc-entity v-if="isPatrolMode && waypoints.length > 2">
        <vc-graphics-polygon
          :hierarchy="waypointPositions"
          :material="'rgba(52, 152, 219, 0.3)'"
          :outline="true"
          :outlineWidth="2"
          :outlineColor="'#2d8cf0'"
        />
      </vc-entity>

      <!-- Connection Lines (Normal Mode) -->
      <vc-entity v-else-if="!isPatrolMode && waypointPositions.length > 1">
        <vc-graphics-polyline
          :positions="waypointPositions"
          :material="'#09ed8b'"
          :width="3"
        />
      </vc-entity>

      <!-- Generated Scan Path (S-Shape) -->
      <vc-entity v-if="isPatrolMode && scanPath.length > 1">
        <vc-graphics-polyline
          :positions="scanPathPositions"
          :material="'#09ed8b'"
          :width="2"
        />
      </vc-entity>
    </vc-viewer>

    <!-- Right Click Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="absolute bg-white shadow-lg rounded-md py-1 z-50 min-w-[120px] border border-gray-200"
      :style="{
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px',
      }"
    >
      <!-- 点击航点时显示删除选项 -->
      <div
        v-if="contextMenu.isWaypoint"
        class="px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors"
        @click="deleteWaypointAtContextMenuPosition"
      >
        删除航点
      </div>
      <!-- 点击空白区域时显示新增选项 -->
      <div
        v-else
        class="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
        @click="addWaypointAtContextMenuPosition"
      >
        新增航点
      </div>
    </div>

    <!-- Coordinate System Info -->
    <div v-if="debugMode" class="absolute bottom-5 right-5 bg-white/95 p-3.5 rounded-lg shadow-md z-10 backdrop-blur-sm">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-500 font-medium">坐标系统</span>
        <span
          class="text-sm font-bold text-green-500 bg-green-50 py-1 px-2.5 rounded font-mono"
          >WGS84</span
        >
      </div>
      <div class="text-[11px] text-green-600 font-medium">✓ 标准GPS坐标</div>
    </div>

    <!-- Location Status Info -->
    <div class="absolute top-5 left-5 bg-white/95 p-3.5 rounded-lg shadow-md z-10 backdrop-blur-sm">
      <div class="flex items-center justify-between mb-2">
        <div v-if="locationStatus === 'loading'" class="flex items-center gap-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span class="text-xs text-gray-600 font-medium">正在获取当前位置...</span>
        </div>
        <div v-else-if="locationStatus === 'success'" class="flex items-center gap-2">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <span class="text-xs text-green-600 font-medium">已定位到当前位置</span>
        </div>
        <div v-else class="flex items-center gap-2">
          <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
          <span class="text-xs text-orange-600 font-medium">使用默认位置（北京）</span>
        </div>
        <button
          @click="getCurrentPosition"
          class="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
          title="重新获取位置"
        >
          <span :class="{ 'animate-spin': locationStatus === 'loading' }">🔄</span>
          <span v-if="debugMode">重试</span>
        </button>
      </div>
      <div v-if="debugMode" class="text-[11px] text-gray-500">
        经度: {{ currentPosition.lng.toFixed(4) }}, 纬度:
        {{ currentPosition.lat.toFixed(4) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import TakeOffPointMap from "@/assets/svgs/takeoff-point-map.svg";
import DroneSvg from "@/assets/svgs/yaw-mode-drone.svg";
import DroneModelUrl from "@/assets/model/drone.glb?url";
import {
  getCesiumHPRFromDjiSpecifications,
  createDroneArrowEntity,
  djiYawToCesiumHeading,
  convertDjiToCesiumAngles
} from "./hooks/helper.ts";
import { ActionType } from "@/types/device.ts";

const props = defineProps({
  selectedAction:{
    type: Object,
    default: null
  },
  selectedActionIndex:{
    type:Number,
    default:0
  },
  waypoints: {
    type: Array,
    default: () => [],
  },
  isClosedLoop: {
    type: Boolean,
    default: false,
  },
  isPatrolMode: {
    type: Boolean,
    default: false,
  },
  scanPath: {
    type: Array,
    default: () => [],
  },
  takeoffPoint: {
    type: String,
    default: "",
  },
  isSettingTakeoffPoint: {
    type: Boolean,
    default: false,
  },
  selectedWaypoint: {
    type: Object,
    default: null,
  },
  debugMode: {
    type: Boolean,
    default: false
  },
  droneYaw: {
    type: Number,
    default: 0
  },
  dronePitch: {
    type: Number,
    default: 0
  },
  frustumParams: {
    type: Object,
    default: () => ({
      fov: 57.4, // DJI Matrice 4TD视角（DFOV）：82° 计算后的FOV 是 57.4°
      fovMax: 57.4,// DJI Matrice 4TD 最大  57.4°
      aspectRatio: 4/3, // DJI Matrice 4TD相机宽高比：4:3
      near: 1.0, // DJI Matrice 4TD对焦点：1米至无穷远
      far: 200, // 远裁剪面
    })
  },
  center: {
    type: Object,
    default: () => ({
      lng:0,
      lat:0,
    }),
  },
  elevationOptimization: {
    type: Boolean,
    default: true
  },
  readonly: {
    type: Boolean,
    default: false
  }
});

watch(
  () => props.scanPath,
  (val) => {
    console.log("MapViewer received scanPath:", val.length);
    if (val && val.length > 0) zoomToFit();
  },
  { deep: true }
);

watch(
  () => props.isPatrolMode,
  (val) => {
    console.log("MapViewer isPatrolMode:", val);
  }
);

const emit = defineEmits(["map-click", "delete-point", "left-click", "terrain-ready"]);

const onTerrainReady = (readyObj) => {
  if (readyObj && readyObj.cesiumObject) {
    emit("terrain-ready", readyObj.cesiumObject);
  }
};

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  lat: 0,
  lng: 0,
  height: 0,
  isWaypoint: false, // 是否点击在航点上
  waypointIndex: -1, // 点击的航点索引
  waypointId: null, // 点击的航点ID
});

// 监听点击事件，关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

const pickEvt = (e)=> {
  console.log(e)
}

// 检测点击位置是否为航点
const detectWaypointAtPosition = (lng, lat) => {
  // 添加防御性检查，确保waypoints是数组
  if (!Array.isArray(props.waypoints) || props.waypoints.length === 0) {
    console.log("没有航点数据");
    return { isWaypoint: false, index: -1, id: null };
  }
  
  // 添加防御性检查，确保lng和lat是有效数字
  if (isNaN(lng) || isNaN(lat)) {
    console.warn("Invalid coordinates for waypoint detection:", { lng, lat });
    return { isWaypoint: false, index: -1, id: null };
  }

  // 进一步增大触发范围：设置更大的容差范围（约30米）
  const tolerance = 0.0003; // 约30米的经纬度容差

  console.log(
    `检测航点点击: 点击位置(${lng}, ${lat}), 航点数量=${props.waypoints.length}, 容差=${tolerance}`
  );

  for (let i = 0; i < props.waypoints.length; i++) {
    const wp = props.waypoints[i];
    
    // 添加防御性检查，确保wp是有效对象
    if (!wp || typeof wp !== 'object') {
      console.warn(`无效的航点对象:`, wp);
      continue;
    }
    
    // 航点数据结构使用 longitude 和 latitude 字段
    const wpLng = wp.longitude || wp.lng;
    const wpLat = wp.latitude || wp.lat;

    // 检查经纬度数据是否有效
    if (typeof wpLng !== "number" || typeof wpLat !== "number" || isNaN(wpLng) || isNaN(wpLat)) {
      console.warn(`航点 ${i} 的经纬度数据无效:`, wp);
      continue;
    }

    const lngDiff = Math.abs(wpLng - lng);
    const latDiff = Math.abs(wpLat - lat);

    // 检查点击位置是否在航点的容差范围内
    if (lngDiff <= tolerance && latDiff <= tolerance) {
      console.log(
        `检测到航点点击: 索引=${i}, 航点(${wpLng}, ${wpLat}), 点击(${lng}, ${lat}), 差值=(${lngDiff}, ${latDiff})`
      );
      return {
        isWaypoint: true,
        index: i,
        id: wp.id || null,
      };
    } else {
      console.log(`航点 ${i} 不匹配: 差值=(${lngDiff}, ${latDiff}), 容差=${tolerance}`);
    }
  }

  console.log("没有检测到航点点击");
  return { isWaypoint: false, index: -1, id: null };
};

// 右键点击事件处理
const onRightClick = (event) => {
  // 检查是否处于设置起飞点模式，如果是则允许默认行为（左键点击）
  if (props.isSettingTakeoffPoint) {
    return; // 在设置起飞点模式下，不显示右键菜单，让父组件处理点击事件
  }

  event.preventDefault();

  if (!viewerInstance || !cesiumInstance) return;

  try {
    // 获取点击位置相对于父容器的坐标
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 将屏幕坐标转换为地图坐标
    const windowPosition = new cesiumInstance.Cartesian2(x, y);
    const ray = viewerInstance.camera.getPickRay(windowPosition);
    if (!ray) return;

    const cartesian3 = viewerInstance.scene.globe.pick(ray, viewerInstance.scene);
    if (!cartesian3) return;

    const cartographic = cesiumInstance.Cartographic.fromCartesian(cartesian3);
    console.log('cartographic', cartographic);
    if (!cartographic) return;

    const lng = cesiumInstance.Math.toDegrees(cartographic.longitude);
    const lat = cesiumInstance.Math.toDegrees(cartographic.latitude);
    const height = cartographic.height;

    // 检测点击位置是否为航点
    const waypointDetection = detectWaypointAtPosition(lng, lat);

    // 更新右键菜单状态 - 使用相对父容器的坐标
    contextMenu.value = {
      visible: true,
      x: x, // 使用相对父容器的X坐标
      y: y, // 使用相对父容器的Y坐标
      lat,
      lng,
      height,
      isWaypoint: waypointDetection.isWaypoint,
      waypointIndex: waypointDetection.index,
      waypointId: waypointDetection.id,
    };

    // 添加全局点击监听器，点击其他地方时关闭菜单
    setTimeout(() => {
      document.addEventListener("click", closeContextMenu, { once: true });
    }, 0);
  } catch (error) {
    console.error("Right click error:", error);
  }
};

// 在右键菜单位置添加航点
const addWaypointAtContextMenuPosition = () => {
  console.log("添加航点===》:", contextMenu.value);
  if (contextMenu.value.visible) {
    emit("map-click", {
      lat: contextMenu.value.lat,
      lng: contextMenu.value.lng,
      height: contextMenu.value.height,
    });
    contextMenu.value.visible = false;
  }
};

// 在右键菜单位置删除航点
const deleteWaypointAtContextMenuPosition = () => {
  if (contextMenu.value.visible && contextMenu.value.isWaypoint) {
    // 通过单项数据流方式，向父组件传递删除事件
    emit("delete-point", {
      waypoint: props.waypoints[contextMenu.value.waypointIndex],
      index: contextMenu.value.waypointIndex,
    });
    contextMenu.value.visible = false;
  }
};

// 鼠标左键点击事件处理
const onLeftClick = (event) => {
  if (props.readonly) return;
  // 检查是否处于设置起飞点模式
  if (props.isSettingTakeoffPoint) {
    // 在设置起飞点模式下，阻止默认行为并获取点击位置
    event.preventDefault();

    if (!viewerInstance || !cesiumInstance) return;

    try {
      // 获取点击位置相对于父容器的坐标
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 将屏幕坐标转换为地图坐标
      const windowPosition = new cesiumInstance.Cartesian2(x, y);
      const ray = viewerInstance.camera.getPickRay(windowPosition);
      if (!ray) return;

      const cartesian3 = viewerInstance.scene.globe.pick(ray, viewerInstance.scene);
      if (!cartesian3) return;

      const cartographic = cesiumInstance.Cartographic.fromCartesian(cartesian3);
      if (!cartographic) return;

      const lng = cesiumInstance.Math.toDegrees(cartographic.longitude);
      const lat = cesiumInstance.Math.toDegrees(cartographic.latitude);
      const height = cartographic.height;

      // 向父组件传递左键点击事件
      emit("left-click", {
        lat,
        lng,
        height,
      });
    } catch (error) {
      console.error("Left click error:", error);
    }
  }
};

// 地图点击事件处理（vc-viewer组件触发）
const onMapClick = (coords) => {
  // 只有在非设置起飞点模式下才处理地图点击事件
  if (!props.isSettingTakeoffPoint) {
    emit("map-click", coords);
  }
};

const camera = ref({
  position: {
    lng: 104.39,
    lat: 31.09,
    height: 1000,
  },
  heading: 360,
  pitch: -90,
  roll: 0,
});

// 计算无人机偏航角：直接使用父组件传递的droneYaw
const droneRotation = computed(() => {
  return djiYawToCesiumHeading(props.droneYaw || 0);
});


const droneOrientation = computed(() => {
  // 直接使用props传递的角度数据，确保模型跟随droneYaw和dronePitch变化
  const yaw = props.droneYaw || 0; 
  const pitch = 0;
  const roll = 0;
  
  // 确保cesiumInstance已初始化
  if (!cesiumInstance) {
    return undefined;
  }
  
  // 确保有选中的航点
  if (!props.selectedWaypoint) {
    return undefined;
  }
  
  // 获取当前航点位置
  const position = {
    lng: props.selectedWaypoint.lng || props.selectedWaypoint.longitude,
    lat: props.selectedWaypoint.lat || props.selectedWaypoint.latitude,
    height: props.selectedWaypoint.height || 0
  };
  
  // 转换为Cartesian3坐标
  const cartesianPosition = cesiumInstance.Cartesian3.fromDegrees(
    position.lng,
    position.lat,
    position.height
  );
  
  // 将角度转换为弧度
  const headingRad = cesiumInstance.Math.toRadians(yaw);
  const pitchRad = cesiumInstance.Math.toRadians(pitch);
  const rollRad = cesiumInstance.Math.toRadians(roll);
  
  // 使用HeadingPitchRollQuaternion直接创建朝向
  // 这将使模型准确跟随droneYaw和dronePitch变化
  return cesiumInstance.Transforms.headingPitchRollQuaternion(
    cartesianPosition,
    new cesiumInstance.HeadingPitchRoll(headingRad, pitchRad, rollRad)
  );
});




// 判断经纬度是否有效的辅助函数
const isValidCoordinate = (coord) => {
  if (!coord || typeof coord !== 'object') return false;
  const { lng, lat } = coord;
  return (
    typeof lng === 'number' && 
    typeof lat === 'number' && 
    lng >= -180 && lng <= 180 && 
    lat >= -90 && lat <= 90 &&
    lng !== 0 && 
    lat !== 0
  );
};

// 判断经纬度是否在中国区域内的辅助函数
const isChinaCoordinate = (coord) => {
  if (!isValidCoordinate(coord)) return false;
  const { lng, lat } = coord;
  // 中国地理范围：经度73°E到135°E，纬度18°N到54°N
  return lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
};

const zoomToFit = () => {
  if (!viewerInstance || !cesiumInstance) return;

  const positions = [];

  // Add takeoff point
  const takeoff = takeoffPointObj.value;
  if (takeoff) {
    positions.push(cesiumInstance.Cartesian3.fromDegrees(takeoff.lng, takeoff.lat, takeoff.height));
  }

  // Add waypoints
  if (Array.isArray(props.waypoints)) {
    props.waypoints.forEach(wp => {
      const lng = wp.lng || wp.longitude;
      const lat = wp.lat || wp.latitude;
      const height = wp.height || 0;
      if (lng && lat) {
        positions.push(cesiumInstance.Cartesian3.fromDegrees(lng, lat, height));
      }
    });
  }

  // Add scan path
  if (Array.isArray(props.scanPath)) {
    props.scanPath.forEach(wp => {
      const lng = wp.lng || wp.longitude;
      const lat = wp.lat || wp.latitude;
      const height = wp.height || 0;
      if (lng && lat) {
        positions.push(cesiumInstance.Cartesian3.fromDegrees(lng, lat, height));
      }
    });
  }

  if (positions.length > 0) {
    const boundingSphere = cesiumInstance.BoundingSphere.fromPoints(positions);
    viewerInstance.camera.flyToBoundingSphere(boundingSphere, {
      duration: 0.5,
      offset: new cesiumInstance.HeadingPitchRange(
        0,
        cesiumInstance.Math.toRadians(-90),
        boundingSphere.radius * 3.0 // Zoom factor
      )
    });
  } else {
    // If no route, try to go to current position
    getCurrentPosition();
  }
};

// 更新地图中心点的函数
const updateMapCenter = (center) => {
  if (!viewerInstance || !center) return;
  
  const { lng, lat } = center;
  if (isChinaCoordinate(center)) {
    console.log("更新地图中心点到指定位置:", lng, lat);
    
    // 更新相机位置到指定中心点
    camera.value.position.lng = lng;
    camera.value.position.lat = lat;
    camera.value.position.height = 1000; // 保持1000米高度
    
    // 更新当前位置
    currentPosition.value = { lng, lat };
    locationStatus.value = "success";
    
    return true;
  }
  return false;
};

// 获取当前位置作为地图中心点
const getCurrentPosition = async () => {
  locationStatus.value = "loading";

  // 首先检查props.center是否包含有效的经纬度
  if (isValidCoordinate(props.center)) {
    console.log("使用传入的中心点:", props.center.lng, props.center.lat);
    updateMapCenter(props.center);
    return;
  }

  // 1. 尝试浏览器原生定位
  const tryBrowserGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("浏览器不支持地理位置API"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lng: position.coords.longitude,
            lat: position.coords.latitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 增加到 10 秒
          maximumAge: 0,
        }
      );
    });
  };

  // 2. IP 定位兜底方案 (使用免费开源的 ipwho.is API)
  const getIpLocation = async () => {
    try {
      // 使用 ipwho.is 免费定位服务，无需 API Key
      const response = await fetch('https://ipwho.is/');
      const data = await response.json();
      
      if (data.success) {
        return {
          lng: data.longitude,
          lat: data.latitude
        };
      }
      throw new Error(data.message || 'IP 定位解析失败');
    } catch (error) {
      console.warn("IP 定位失败:", error.message);
      return null;
    }
  };

  try {
    // 尝试浏览器定位
    const pos = await tryBrowserGeolocation();
    console.log("浏览器定位成功:", pos);
    updateLocationSuccess(pos.lng, pos.lat);
  } catch (error) {
    console.warn("浏览器定位失败，尝试 IP 定位:", error.message);
    
    // 浏览器定位失败（可能是权限拒绝、非 HTTPS 或超时），尝试 IP 定位
    const ipPos = await getIpLocation();
    if (ipPos) {
      console.log("IP 定位成功:", ipPos);
      updateLocationSuccess(ipPos.lng, ipPos.lat);
    } else {
      // 所有定位手段均失敗，使用默認位置 (北京)
      const defaultPos = { 
        lng: Number(import.meta.env.VITE_POSITION_LNG || 116.4074), 
        lat: Number(import.meta.env.VITE_POSITION_LAT || 39.9042)
      };
      updateLocationSuccess(defaultPos.lng, defaultPos.lat);
      locationStatus.value = "error"; // 標記為 error 以便 UI 提示
    }
  }
};

// 统一定位成功处理函数
const updateLocationSuccess = (lng, lat) => {
  currentPosition.value = { lng, lat };
  
  // 更新相机位置
  camera.value.position.lng = lng;
  camera.value.position.lat = lat;
  camera.value.position.height = 1000;
  
  locationStatus.value = "success";
};

const pointGraphics = {
  pixelSize: 10,
  color: "red",
  outlineColor: "white",
  outlineWidth: 2,
};

// 起飞点图形样式
const takeoffPointGraphics = {
  pixelSize: 20, // 减小点的大小，避免挡住图标
  color: "#3498db", // 蓝色背景
  outlineColor: "white",
  outlineWidth: 2,
  verticalOrigin: 1, // 将点的底部对齐到位置，让billboard显示在上方
  heightReference: 0, // 确保点在正确的高度渲染
  zIndex: 1,
};

let cesiumInstance = null;
let viewerInstance = null;

// 位置获取状态
const locationStatus = ref("loading"); // loading, success, error
const currentPosition = ref({ lng: 116.4074, lat: 39.9042 });

// 解析起飞点字符串为对象
const parseTakeoffPoint = (pointStr) => {
  if (!pointStr) return null;
  const [lat, lng, height] = pointStr.split(",").map(Number);
  
  // 添加防御性检查，确保lat和lng是有效数字
  if (isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid takeoff point format:', pointStr);
    return null;
  }
  
  return { 
    lat, 
    lng, 
    height: isNaN(height) ? 0 : height 
  };
};

// 计算起飞点位置
const takeoffPointObj = computed(() => {
  return parseTakeoffPoint(props.takeoffPoint);
});

// 计算起飞点到第一个航点的连接线
const takeoffToWaypointPositions = computed(() => {
  const positions = [];

  // 添加起飞点
  const takeoff = takeoffPointObj.value;
  if (takeoff) {
    positions.push(takeoff);

    // 根据模式选择不同的第一个点
    if (props.isPatrolMode) {
      // 巡逻模式：使用scanPath的第一个点
      if (Array.isArray(props.scanPath) && props.scanPath.length > 0) {
        const firstPoint = props.scanPath[0];
        positions.push({
          lng: firstPoint.lng || firstPoint.longitude || 0,
          lat: firstPoint.lat || firstPoint.latitude || 0,
          height: firstPoint.height || 0,
        });
      }
    } else {
      // 非巡逻模式：使用waypoints的第一个点
      if (Array.isArray(props.waypoints) && props.waypoints.length > 0) {
        const firstWaypoint = props.waypoints[0];
        positions.push({
          lng: firstWaypoint.lng || firstWaypoint.longitude || 0,
          lat: firstWaypoint.lat || firstWaypoint.latitude || 0,
          height: firstWaypoint.height || 0,
        });
      }
    }
  }

  return positions;
});

const waypointPositions = computed(() => {
  // 添加防御性检查，确保waypoints是数组
  if (!Array.isArray(props.waypoints)) {
    return [];
  }
  
  const positions = props.waypoints.map((wp) => ({
    // 确保lng和lat有有效值，避免undefined
    lng: wp.lng || wp.longitude || 0,
    lat: wp.lat || wp.latitude || 0,
    height: wp.height || 0,
  }));
  // Normal mode closed loop logic
  if (!props.isPatrolMode && props.isClosedLoop && positions.length >= 2) {
    positions.push(positions[0]);
  }
  return positions;
});

// 初始化四棱锥体
let frustumPrimitiveLine = null;
let cameraFru = null;
let maxFrustumPrimitiveLine = null;
let maxCameraFru = null;

// 初始化视锥
const initFrustum = () => {
  // 如果是测绘模式 ，则不初始化视锥体
  if(props.isPatrolMode) return;

  if (!viewerInstance || !props.selectedWaypoint ) return;
  // 清除现有的四棱锥体
  clearFrustum();

  // 获取选中航点的位置和角度
  const waypoint = props.selectedWaypoint;
  const position = {
    lng: waypoint.longitude || waypoint.lng,
    lat: waypoint.latitude || waypoint.lat,
    height: waypoint.height || 0
  };

  // 直接使用父组件传递的角度数据
  const yaw = props.droneYaw || 0;
  const pitch = props.dronePitch || 0;
  const roll = 0;

  // 创建相机参数对象
  const cameraParams = {
    position,
    yaw,
    pitch,
    roll
  };

  // 1. 创建实际视锥体（当前fov）
  cameraFru = new cesiumInstance.Camera(viewerInstance.scene);
  cameraFru.frustum = new cesiumInstance.PerspectiveFrustum({
    fov: cesiumInstance.Math.toRadians(props.frustumParams.fov),
    aspectRatio: props.frustumParams.aspectRatio,
    near: props.frustumParams.near,
    far: props.frustumParams.far,
  });
  setCameraView(cameraFru, cameraParams);

  // 创建调试相机原语（实际视锥体）
  frustumPrimitiveLine = new cesiumInstance.DebugCameraPrimitive({
    camera: cameraFru,
    color: cesiumInstance.Color.fromCssColorString('#00ee8b').withAlpha(0.5), // 使用指定的绿色和透明度
    updateOnChange: false,
  });
  viewerInstance.scene.primitives.add(frustumPrimitiveLine);

  // 2. 创建最大视锥体（fovMax）
  if (props.frustumParams.fovMax !== undefined) {
    maxCameraFru = new cesiumInstance.Camera(viewerInstance.scene);
    maxCameraFru.frustum = new cesiumInstance.PerspectiveFrustum({
      fov: cesiumInstance.Math.toRadians(props.frustumParams.fovMax),
      aspectRatio: props.frustumParams.aspectRatio,
      near: props.frustumParams.near,
      far: props.frustumParams.far,
    });
    setCameraView(maxCameraFru, cameraParams);

    // 创建调试相机原语（最大视锥体，黄色）
    maxFrustumPrimitiveLine = new cesiumInstance.DebugCameraPrimitive({
      camera: maxCameraFru,
      color: cesiumInstance.Color.fromCssColorString('#ffc107').withAlpha(0.3), // 使用黄色和较低透明度
      updateOnChange: false,
    });
    viewerInstance.scene.primitives.add(maxFrustumPrimitiveLine);
  }
};

// 设置相机视图的辅助函数
const setCameraView = (camera, params) => {
  const { position, yaw, pitch, roll } = params;
  camera.setView({
    destination: cesiumInstance.Cartesian3.fromDegrees(
      position.lng,
      position.lat,
      position.height
    ),
    orientation: {
      heading: cesiumInstance.Math.toRadians(yaw),
      pitch: cesiumInstance.Math.toRadians(pitch),
      roll: cesiumInstance.Math.toRadians(roll),
    },
    up: cesiumInstance.Cartesian3.UNIT_Z,
  });
};

// 更新四棱锥体
const updateFrustum = () => {
  if(props.isPatrolMode) return;
  // 判断如果是 测绘模式 则不更新视锥体
  if (!viewerInstance || !props.selectedWaypoint) return;

  // 直接调用initFrustum重新创建视锥体
  initFrustum();
};

// 清除四棱锥体
const clearFrustum = () => {
  // 清除实际视锥体
  if (frustumPrimitiveLine) {
    viewerInstance.scene.primitives.remove(frustumPrimitiveLine);
    frustumPrimitiveLine = null;
  }
  if (cameraFru) {
    cameraFru = null;
  }
  
  // 清除最大视锥体
  if (maxFrustumPrimitiveLine) {
    viewerInstance.scene.primitives.remove(maxFrustumPrimitiveLine);
    maxFrustumPrimitiveLine = null;
  }
  if (maxCameraFru) {
    maxCameraFru = null;
  }
};

// 监听设置起飞点状态，修改鼠标样式
watch(() => props.isSettingTakeoffPoint, (newVal) => {
  if (!viewerInstance) return;

  if (newVal) {
    // 设置为自定义鼠标样式（使用起飞点图标）
    viewerInstance.container.style.cursor = `url(${TakeOffPointMap}) 16 16, auto`;
  } else {
    // 恢复默认鼠标样式
    viewerInstance.container.style.cursor = "default";
  }
});

// 监听起飞点变化，更新地图
watch(() => props.takeoffPoint, (newVal) => {
  console.log("Takeoff point updated:", newVal);
  // zoomToFit();
});

// 监听选中航点变化，更新四棱锥体
watch(() => props.selectedWaypoint, (newVal) => {
  // 如果是测绘模式 ，则不更新视锥体
  if(!props.isPatrolMode){
    if (newVal) {
      initFrustum();
    } else {
      clearFrustum();
    }
  }
}, { deep: true, immediate: true });

  // 监听航点数组变化，更新四棱锥体
watch(() => props.waypoints, () => {
  if (props.selectedWaypoint) {
    updateFrustum();
  }
  // 如果是第一次加载航点，才缩放
  // zoomToFit();
}, { deep: true });

// 监听无人机角度变化，更新四棱锥体
watch([() => props.droneYaw, () => props.dronePitch], () => {
  if (props.selectedWaypoint) {
    updateFrustum();
  }
});

// 监听无人机zoom变化，更新四棱锥体
watch([() => props.frustumParams, () => props.dronePitch], () => {
  if (props.selectedWaypoint) {
    updateFrustum();
  }
});

// 监听center变化，当center变为有效的经纬度时更新地图中心点
watch(() => props.center, (newCenter, oldCenter) => {
  console.log("center属性发生变化:", newCenter);
  
  if (isValidCoordinate(newCenter)) {
    console.log("检测到有效的center，更新地图中心点");
    updateMapCenter(newCenter);
  }
}, { deep: true });

// 组件销毁时清除四棱锥体
onUnmounted(() => {
  clearFrustum();
});

const scanPathPositions = computed(() => {
  // 添加防御性检查，确保scanPath是数组
  if (!Array.isArray(props.scanPath)) {
    return [];
  }
  
  return props.scanPath.map((wp) => {
    // 添加防御性检查，确保wp是有效对象
    if (!wp || typeof wp !== 'object') {
      return {
        lng: 0,
        lat: 0,
        height: 0
      };
    }
    
    return {
      // 确保lng和lat有有效值，避免undefined
      lng: wp.lng || wp.longitude || 0,
      lat: wp.lat || wp.latitude || 0,
      height: wp.height || 0,
    };
  });
});
 // 天地图相关配置
  const apiKeys = [
    "1ae257dc274381bc5f14e3e8b8957312",
    "6519adb5c95e116ccef862284932b551",
    "08588d4ad5b078b22b6727eaab32e60a",
    "607b3eb7e11ce7a2676178b599bbeb16",
    "1c11ee425cb9824fa5011d052c72b6d5",
    "dfdaeaee8b34d13ffc3de3658a84f66a",
    "ee6077be753f24382d1c19c8484bf82c",
  ];
  const getRandomApiKey = () => {
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
  };

const onViewerReady = async ({ Cesium, viewer }) => {
  console.log("Viewer ready");
  cesiumInstance = Cesium;
  viewerInstance = viewer;

  viewer.imageryLayers.removeAll();



  // 天地图相关配置
  const apiKeys = [
    "1ae257dc274381bc5f14e3e8b8957312",
    "6519adb5c95e116ccef862284932b551",
    "08588d4ad5b078b22b6727eaab32e60a",
    "607b3eb7e11ce7a2676178b599bbeb16",
    "1c11ee425cb9824fa5011d052c72b6d5",
    "dfdaeaee8b34d13ffc3de3658a84f66a",
    "ee6077be753f24382d1c19c8484bf82c",
  ];
  const getRandomApiKey = () => {
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
  };

  const imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
    url: `http://t0.tianditu.gov.cn/img_w/wmts?tk=${getRandomApiKey()}`, // 替换为你的天地图密钥
    layer: "img",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "w",
    // 层级设置
    maximumLevel: 18,
    minimumLevel: 3,
    preload: 5,
    credit: "天地图",
  });


  // 加载中文注记图层
  const imageryProviderCia = new Cesium.WebMapTileServiceImageryProvider({
    url: `https://t0.tianditu.gov.cn/cia_w/wmts?tk=${getRandomApiKey()}`,
    layer: "cia",
    style: "default",
    format: "image/jpeg",
    tileMatrixSetID: "w",
    maximumLevel: 18,
    credit: "天地图注记",
    preload: 5,
    // 层级设置
    maximumLevel: 18,
    minimumLevel: 3,
  });
  viewer.imageryLayers.addImageryProvider(imageryProvider);
  viewer.imageryLayers.addImageryProvider(imageryProviderCia);

  // 获取当前位置作为地图中心点
  zoomToFit();
  
  // 初始化四棱锥体
  updateFrustum();
  
  // 强制刷新一次布局，解决Flex布局下可能出现的地图渲染不全/灰屏问题
  setTimeout(() => {
    viewer.resize();
  }, 200);
  setTimeout(() => {
    viewer.resize();
  }, 1000);

  
  // 启动 ResizeObserver 监听容器大小变化
  startResizeObserver();
};



// ResizeObserver 相关逻辑
let resizeObserver = null;
const startResizeObserver = () => {
  if (!viewerInstance || !viewerInstance.container) return;
  
  // 清理旧的 observer
  stopResizeObserver();
  
  resizeObserver = new ResizeObserver(() => {
    if (viewerInstance && !viewerInstance.isDestroyed()) {
      viewerInstance.resize();
    }
  });
  
  resizeObserver.observe(viewerInstance.container.parentElement || viewerInstance.container);
};

const stopResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
};

// 组件销毁时清理资源
onUnmounted(() => {
  clearFrustum();
  stopResizeObserver();
  
  // 确保 viewer 实例引用被清除，防止内存泄漏
  cesiumInstance = null;
  viewerInstance = null;
});
</script>
