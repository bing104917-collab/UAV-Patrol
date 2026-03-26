<template>
  <div class="route-planning-container">
    <!-- 头部组件 -->
    <RoutePlanningHeader 
      :route-config-active="routeConfigVisible"
      :route-config="routeConfig"
      :is-patrol-mode="isPatrolMode"
      @back="handleBack"
      @save="handleSave"
      @route-config="toggleRouteConfig"
      @settings="handleSettings"
      @keyboard="handleKeyboard"
      @edit-mission="handleEditMission"
      @save-kmz="handleGenerateKMZ"
    />
    
    <!-- 主体区域 -->
    <div class="route-planning-body" v-if="isDataLoaded">
      <!-- 左侧航点列表组件 -->
      <WaypointList 
        :waypoints="waypoints"
        :selected-waypoint="selectedWaypoint"
        :selected-action-index="selectedActionIndex"
        :debug-mode="debugMode"
        :route-stats="combinedRouteStats"
        :is-patrol-mode="isPatrolMode"
        :template-type="routeConfig.templateType"
        @reverse-waypoints="reverseWaypoints"
        @waypoint-click="handleWaypointClick"
        @action-click="selectAction"
        @delete-point="handleDeletePoint"
        @delete-action="handleDeleteAction"
      >
        <!-- 通过插槽传递RouteConfigDialog组件 -->
        <template #route-config-dialog>
          <RouteConfigDialog
            :visible="true"
            :config-data="routeConfig"
            :is-patrol-mode="isPatrolMode"
            @update:visible="routeConfigVisible = $event"
            @update:config-data="routeConfig = $event"
            @set-takeoff-point="handleSetTakeoffPoint"
            @reset-takeoff-point="handleResetTakeoffPoint"
          />
        </template>
      </WaypointList>
      
      <!-- 中間地圖區域 -->
      <div class="map-area">
        <!-- 動作組件 快捷添加動作 -->
        <ActionPanel 
           v-if="routeConfig.templateType === 'waypoint'"
          :selected-waypoint="selectedWaypoint"
          :selected-action="selectedAction"
          :selected-action-index="selectedActionIndex"
          @update:selected-action="selectedAction = $event"
          @update:selected-action-index="selectedActionIndex = $event"
          @add-action="handleAddActionFromPanel"
        />
        
        <MapViewer
          :waypoints="waypoints"
          :is-closed-loop="false"
          :scan-path="coordinates"
          :is-patrol-mode="isPatrolMode"
          :takeoff-point="routeConfig.takeOffRefPoint"
          :is-setting-takeoff-point="isSettingTakeoffPoint"
          :selected-waypoint="selectedWaypoint"
          :debug-mode="debugMode"
          :selected-action-index="selectedActionIndex"
          :selected-action="selectedAction"
          :drone-yaw="droneAngles.yaw"
          :drone-pitch="droneAngles.pitch"
          :frustum-params="frustumParams"
          :center="center"
          @map-click="handleMapClick"
          @delete-point="handleDeletePoint"
          @left-click="handleLeftClick"
          @terrain-ready="handleTerrainReady"
          class="h-full w-full"
        />
      </div>
      
      <!-- 右侧动作设置面板 -->
       <!-- v-if="routeConfig.templateType === 'waypoint'" -->
      <div class="action-setting-container" v-if="routeConfig.templateType === 'waypoint'"> 
        <ActionSettingPanel 
          :selected-action="selectedAction"
          @delete-action="deleteActionFromPanel"
          @update:action-value="updateActionValue"
        />
        
        <!-- 相机预览区域 -->
        <MiniMapContainer 
        
          :waypoints="waypoints"
          :selected-waypoint="selectedWaypoint"
          :debug-mode="debugMode"
          :drone-yaw="droneAngles.yaw"
          :drone-pitch="droneAngles.pitch"
          :drone-zoom="droneZoom"
          :terrain-provider="sharedTerrainProvider"
        />

        
      </div>
    </div>
    
    <!-- 航线配置弹窗组件 -->
    <RouteConfigDialog
      v-if="!isPatrolMode"
      v-model:visible="routeConfigVisible"
      v-model:config-data="routeConfig"
      :is-patrol-mode="isPatrolMode"
      @set-takeoff-point="handleSetTakeoffPoint"
      @reset-takeoff-point="handleResetTakeoffPoint"
    />
    
    <!-- 起飞点设置提示框 -->
    <div v-if="showTakeoffHint" class="takeoff-hint-overlay">
      <div class="takeoff-hint-content">
        <p>点击地图设置参考起飞点</p>
      </div>
    </div>

    <!-- 生成航线加载提示框 -->
    <div v-if="isGeneratingRoute" class="takeoff-hint-overlay">
      <div class="takeoff-hint-content">
        <p>正在生成航线，请稍候...</p>
      </div>
    </div>

    <!-- 创建航线模态框 -->
    <CreateMissionModal :route-config="routeConfig" :device-options="deviceOptions" :visible="showCreateModal" :is-edit="isEdit" @cancel="showCreateModal = false" @confirm="onMissionCreated" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, onErrorCaptured } from "vue";
import {  Plus } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import MapViewer from "./MapViewer.vue";
import WaypointList from "./WaypointList.vue";
import ActionSettingPanel from "./ActionSettingPanel.vue";
import MiniMapContainer from "./MiniMapContainer.vue";
import RoutePlanningHeader from "./RoutePlanningHeader.vue";
import ActionPanel from "./ActionPanel.vue";
import RouteConfigDialog from "./RouteConfigDialog.vue";
import * as Cesium from "cesium";
import { ActionType, getActionConfig } from "@/types/device";
import wayPointData from "./wayPoint.json";
// 导入无人机角度计算函数
import {
  extractYawFromWaypoint,
  calculateDroneRotation,
  extractActionFromWaypoint
} from "./hooks/helper.ts";
import CreateMissionModal from './CreateMissionModal.vue';
import { WaylineFileApi } from '@/api/wayline'
import { useRoute, useRouter } from "vue-router";
import { DeviceApi } from "@/api/drone/device";
import { calculateRouteStats, CAMERA_PRESETS, generatePolygonRoute } from '@/utils/utils/polygonRouteGenerator';
import { generateScanPath } from '@/utils/utils/routePlanner';
import { generateKMZ } from '@/utils/utils/kmzGenerator';
// import { useMessage } from "@/hooks/web/useMessage";
const message = ElMessage;


// 航点数据 - 初始化为样例数据的 routePointList 格式
const waypoints = ref([]);

// 导入FOV计算函数
import { calculateFovFromZoom } from "./hooks/helper.ts";
// const message = useMessage() // 消息弹窗
const router = useRouter(); // 路由

// 错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('WayLineGenerator Error Captured:', err, info);
  ElMessage.error('编辑器发生错误，请刷新重试: ' + err.message);
  isDataLoaded.value = true; // 确保加载动画消失
  return false;
});

// 缩放值，设备最大zoom为112
// const zoom = ref(1); // 默认zoom为1

// 计算属性：判断是否为巡逻模式
const isPatrolMode = computed(() => {
  // 安全检查：确保routeConfig.value存在且templateType有值
  if (!routeConfig.value || !routeConfig.value.templateType) {
    return false;
  }
  return routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol';
});

// 视锥体参数配置 - 动态计算FOV
const frustumParams = computed(() => {
  const fovMax = 57.4; // zoom=1时的FOV
  const fovMin = 9.1; // zoom=112时的FOV
  const maxZoom = 112; // 设备最大zoom
  
  // 使用线性映射计算FOV
  const calculatedFov = calculateFovFromZoom(fovMax, fovMin, zoom.value, maxZoom);
  console.log('calculatedFov', calculatedFov);
  return {
    fov: calculatedFov,
    fovMax: fovMax,
    aspectRatio: 4/3,
    near: 1.0,
    far: 200
  };
});
const route = useRoute();
const wayLineId = ref(route.query.id || null);
const isEdit = ref(route.query.id == null ? false : true);
const center = ref({
  lng:0,
  lat:0,
})
// 航线配置 - 初始化为样例数据的格式
const routeConfig = ref({
  fileName: wayPointData.fileName, // 航线名称
  templateType: wayPointData.templateType, // 航线模板类型 waypoint 航点飞行；mapping2d 建图航拍；mapping3d 倾斜摄影；mappingStrip 航带飞行
  takeOffRefPoint: wayPointData.takeOffRefPoint, // 起飞点
  droneType: wayPointData.droneType, // 无人机类型
  subDroneType: wayPointData.subDroneType, // 无人机子机类型
  payloadType: wayPointData.payloadType, // 负载类型
  payloadPosition: wayPointData.payloadPosition, // 负载挂载位置
  imageFormat: wayPointData.imageFormat, // 负载图片存储类型 visable：可见光；ir：红外
  flyToWaylineMode: wayPointData.flyToWaylineMode, // 飞航模式 safely：安全模式；pointToPoint  倾斜爬升
  finishAction: wayPointData.finishAction, // 航线结束动作 goHome：退出航线模式并返航； noAction：退出航线模式； autoLand：退出航线
  exitOnRCLost: wayPointData.exitOnRCLost, // 失控是否继续执行航线 goContinue：继续执行航线 ，executeLostAction：执行失控动作
  executeRCLostAction: 'goBack',
  autoFlightSpeed: wayPointData.autoFlightSpeed, // 全局航线飞行速度
  globalHeight: wayPointData.globalHeight, // 全局高度
  takeOffSecurityHeight: wayPointData.takeOffSecurityHeight, // 起飞安全高度
  exitOnRcLostAction: wayPointData.exitOnRcLostAction, // 失控动作类型 goBack 返航；landing 降落；hover：悬停
  heightMode: wayPointData.heightMode, // 高度模式 relativeToStartPoint、aboveGroundLevel、EGM96
  waypointHeadingReq: wayPointData.waypointHeadingReq, // 航点偏航角度
  useGlobalHeight: wayPointData.useGlobalHeight, // 是否使用全局高度
  waypointTurnReq: wayPointData.waypointTurnReq, // 全局航点转弯模式
  gimbalPitchMode: wayPointData.gimbalPitchMode, // 云台俯仰角控制模式 usePointSetting 依照每个航点设置；manual 手动控制
  distance: 0, // 航线总距离
  time: 0,  // 航线总时间
  aircraftSeries:wayPointData.aircraftSeries, // 无人机类型
  aircraftModel: wayPointData.aircraftModel, // 无人机子机类型
  droneEnumValue: wayPointData.droneEnumValue, // 负载类型
  payloadEnumValue: wayPointData.payloadEnumValue, // 负载挂载位置
  as1:wayPointData.as1, // 是否使用喊话器
  al1:wayPointData.al1, // 是否使用探照灯
  fovMax: wayPointData.fovMax, // 设备最大FOV
  fovMin: wayPointData.fovMin, // 设备最小FOV
  zoom: wayPointData.zoom, // 设备最大zoom
  isClosedLoop: false, // 是否使用闭环
  routePointList: [], // 航线点列表
  coordinates: [], // 航线坐标点列表
  scanSetting: { // 扫描参数todo
    overlap: 20,
    angle: 0,
    margin: 0
  },
  mappingTypeReq: { // 建图航拍参数
    collectionMethod: "ortho", // 采集方式 ortho：正射采集。inclined：倾斜采集
    lensType: "camera", // lidar：激光。camera：可见光
    orthoCameraOverlapH: 80, // 可见光航向重叠率（正射）
    orthoCameraOverlapW: 70, // 可见光旁向重叠率（正射）
    inclinedCameraOverlapH: 80, // 可见光航向重叠率（倾斜）
    inclinedCameraOverlapW: 70, // 可见光旁向重叠率（倾斜）
    elevationOptimizeEnable: 0, // 是否开启高程优化 0：不开启；1：开启
    shootType: "time", // 拍照模式
    direction: 0, //
    margin: 0,
    autoAngleOptimize: true, // 是否开启自动角度优化
  },
  
});
// 航线配置弹窗可见性
const routeConfigVisible = ref(false);

// 共享的地形服务实例
const sharedTerrainProvider = ref(null);
const handleTerrainReady = (provider) => {
  console.log('地形服务已就绪，正在共享给其他组件');
  sharedTerrainProvider.value = provider;
};

// 提示框显示状态
const showTakeoffHint = ref(false);

// 创建任务模态框相关
const showCreateModal = ref(false);

// 调试模式
const debugMode = ref(false);

// 选中的动作
const selectedAction = ref(null);
const selectedWaypoint = ref(null);
const selectedActionIndex = ref(null);
const coordinates = ref([]);

const beforeUnloadHandler = async (e) => {
  
    if (this.hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = '确定要离开吗？未保存的更改将会丢失。'
      return '确定要离开吗？未保存的更改将会丢失。'
    }
}

const deviceOptions = ref([]);
const getDeviceList = async () => {
  try {
    const data = await DeviceApi.getDeviceList();
    deviceOptions.value = data.map((item) => ({
      ...item,
      value: item.deviceSn,
      label: item.deviceName + '：' + item.deviceSn,
    }));
    console.log("deviceOptions", deviceOptions.value);
  } finally {
  }
};

// 合并后的onMounted函数
onMounted( async () => {
  try {
    await getDeviceList();
    window.addEventListener('onBeforeUnmount', beforeUnloadHandler)

    console.log('onMounted');
    console.log('wayLineId', wayLineId.value);
    console.log('isEdit', isEdit.value);

    if(wayLineId.value){
      // 编辑模式
      let res = await WaylineFileApi.getWaylineFile(wayLineId.value)
      console.log('res', res);
      if(res && res.kmzInfo){
        routeConfig.value = res.kmzInfo;
      }
      if (routeConfig.value.routePointList && routeConfig.value.routePointList.length > 0) {
        waypoints.value = routeConfig.value.routePointList.map((point, index) => {
          return {
            id: Date.now() + index,
            ...point
          };
        });
      }
      if(res.kmzInfo.coordinates && res.kmzInfo.coordinates.length > 0){
        // 获取扫描路径
        // coordinates.value = res.kmzInfo.coordinates.map(coord => ({...coord,
        //   height: routeConfig.value.globalHeight,
        // }))
      }
      console.log('coordinates', coordinates.value);
      console.log('isPatrolMode', routeConfig.value.templateType, isPatrolMode.value);
      if(isPatrolMode.value){
        routeConfigVisible.value = true;
        if (res.kmzInfo.coordinatesOri || res.kmzInfo.coordinates) {
          coordinates.value = formatPoints(res.kmzInfo.coordinatesOri || res.kmzInfo.coordinates);
        }
        if (res.kmzInfo.routePointListOri) {
          waypoints.value = formatPoints(res.kmzInfo.routePointListOri);
        }

        // Calculate stats on load
        if (coordinates.value && waypoints.value) {
           polygonRouteStats.value = calculateRouteStats(coordinates.value, waypoints.value, {
              height: routeConfig.value.globalHeight,
              camera: CAMERA_PRESETS[routeConfig.value.aircraftModel] || CAMERA_PRESETS.m4td,
              overlapRate: parseFloat(((routeConfig.value.mappingTypeReq?.orthoCameraOverlapH || 80) / 100).toFixed(1))
           });
        }
      }
      
    }else{
      // 创建模式
      // 如果有外部传递的顶点数据，优先使用
      if (route.query.vertices) {
        try {
          const vertices = JSON.parse(route.query.vertices);
          if (Array.isArray(vertices) && vertices.length > 0) {
            waypoints.value = vertices.map((v, index) => ({
              id: Date.now() + index,
              ...v
            }));
            // 如果传递了模板类型，设置它
            if (route.query.templateType) {
              routeConfig.value.templateType = route.query.templateType;
            } else {
              // 默认设为面状航线
              routeConfig.value.templateType = 'mapping2d';
            }
            // 设置传递过来的名称
            if (route.query.name) {
              routeConfig.value.fileName = route.query.name;
            } else {
              routeConfig.value.fileName = '标注转换_' + new Date().getTime();
            }
            
            // 显示创建弹窗，让用户确认名称和选择设备
            showCreateModal.value = true;
          }
        } catch (e) {
          console.error('解析顶点数据失败:', e);
        }
      }

      // 如果没有外部数据或解析失败，使用样例数据
      if (waypoints.value.length === 0) {
        if (wayPointData.routePointList && wayPointData.routePointList.length > 0) {
          waypoints.value = wayPointData.routePointList.map((point, index) => {
            return {
              id: Date.now() + index,
              ...point
            };
          });
        }
        handleEditMission()
      }
    }

    // 航点航线 默认选中第一个航点的第一个动作
    if ( routeConfig.value.templateType === 'waypoint' && waypoints.value.length > 0) {
      const firstWaypoint = waypoints.value[0];
      selectedWaypoint.value = firstWaypoint;
      
      // 如果第一个航点有动作，选中第一个动作
      if (firstWaypoint.actionGroupList && firstWaypoint.actionGroupList.length > 0 && firstWaypoint.actionGroupList[0].actions && firstWaypoint.actionGroupList[0].actions.length > 0) {
        const firstAction = firstWaypoint.actionGroupList[0].actions[0];
        selectedAction.value = JSON.parse(JSON.stringify(firstAction));
        selectedActionIndex.value = 0;
      } else {
        // 如果没有动作，设置选中索引为null（表示选中第一个动作位置）
        selectedActionIndex.value = null;
      }
    } else if ((routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol') && waypoints.value.length > 0) {
       // 面状/巡逻航线：强制触发一次生成，确保数据加载后立即显示
       console.log('onMounted 强制触发航线生成');
       // 使用 setTimeout 确保在数据完全响应式化之后执行
       setTimeout(() => {
         generatePolygonRouteInternal();
       }, 500);
    }
  } finally {
    // 数据加载完成，显示界面
    isDataLoaded.value = true;
  }
});


onBeforeUnmount(() => {
  window.removeEventListener('onBeforeUnmount', beforeUnloadHandler)
});


// 监听起飞点变化，设置后隐藏提示框
watch(() => routeConfig.value.takeOffRefPoint, (newVal) => {
  if (newVal) {
    showTakeoffHint.value = false;
  }
});


// 使用计算属性计算无人机角度，而不是直接修改原对象
const droneAngles = computed(() => {
  // 安全检查：非waypoint模式下不计算角度，防止报错
  if (routeConfig.value?.templateType !== 'waypoint') {
    return { yaw: 0, pitch: 0 };
  }

  if (!selectedWaypoint.value) {
    return { yaw: 0, pitch: 0 };
  }
  
  // 计算偏航角
  let yaw;
  if (selectedWaypoint.value?.actionGroupList?.length > 0) {
    yaw = extractYawFromWaypoint(selectedWaypoint.value, ActionType);
  }
  
  if (yaw == null) {
    yaw = calculateDroneRotation(
      selectedWaypoint.value,
      waypoints.value,
      false // isClosedLoop，暂时固定为false，可根据实际情况调整
    );
  }
  
  // 计算俯仰角
  const pitch = extractActionFromWaypoint(selectedAction.value, selectedActionIndex.value, selectedWaypoint.value, waypoints.value, ActionType.PITCH);
  
  return { yaw, pitch };
});

const droneZoom = computed(() => {
  return {
    zoom: zoom.value,
    zoomMin: 1,
    zoomMax: 112
  };
});

// 使用计算属性计算无人机角度，而不是直接修改原对象
const zoom = computed(() => {
  // 安全检查：非waypoint模式下不计算zoom，防止报错
  if (routeConfig.value?.templateType !== 'waypoint') {
    return 1;
  }

  if (!selectedWaypoint.value) {
    return 1
  }
  
  // zoom
  let zoom;
  if (selectedWaypoint.value?.actionGroupList?.length > 0) {
    zoom = extractActionFromWaypoint(selectedAction.value, selectedActionIndex.value, selectedWaypoint.value, waypoints.value, ActionType.ZOOM);
  }

  
  return zoom;
});


// 监听航线和动作变化，更新无人机角度
watch([waypoints, selectedAction, selectedActionIndex, selectedWaypoint], () => {
  // 计算角度会自动触发computed属性更新，不需要手动修改selectedWaypoint
}, { deep: true });

// 监听waypoints变化，设置autoAngleOptimize为true
watch(waypoints, () => {
  if (!routeConfig.value.mappingTypeReq) {
    routeConfig.value.mappingTypeReq = {};
  }
  routeConfig.value.mappingTypeReq.autoAngleOptimize = true;
  console.log('🔄 Waypoints变化，设置autoAngleOptimize为true');
}, { deep: true });

// 监听direction变化，设置autoAngleOptimize为false
watch(() => routeConfig.value.mappingTypeReq?.direction, (newDirection, oldDirection) => {
  if (newDirection !== oldDirection && newDirection !== undefined) {
    if (!routeConfig.value.mappingTypeReq) {
      routeConfig.value.mappingTypeReq = {};
    }
    routeConfig.value.mappingTypeReq.autoAngleOptimize = false;
    console.log('🔄 Direction变化，设置autoAngleOptimize为false');
  }
});


// 计算两点之间的距离（使用Haversine公式）
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // 距离（米）
};

// 计算航线总距离
const calculateTotalDistance = () => {
  if (waypoints.value.length < 1) return 0;
  
  let totalDistance = 0;
  
  // 如果有起飞点，计算起飞点到第一个航点的距离
  if (routeConfig.value.takeOffRefPoint && 
      routeConfig.value.takeOffRefPoint.latitude && 
      routeConfig.value.takeOffRefPoint.longitude &&
      waypoints.value.length > 0) {
    const takeoffPoint = routeConfig.value.takeOffRefPoint;
    const firstWaypoint = waypoints.value[0];
    totalDistance += calculateDistance(
      takeoffPoint.latitude, takeoffPoint.longitude,
      firstWaypoint.latitude, firstWaypoint.longitude
    );
  }
  
  // 计算航点之间的距离
  for (let i = 0; i < waypoints.value.length - 1; i++) {
    const current = waypoints.value[i];
    const next = waypoints.value[i + 1];
    totalDistance += calculateDistance(
      current.latitude, current.longitude,
      next.latitude, next.longitude
    );
  }
  
  // 保留一位小数
  return Math.round(totalDistance * 10) / 10;
};

// 格式化时间（秒转换为m分s秒格式）
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m${remainingSeconds}s`;
};

// 计算航线时间
const calculateFlightTime = () => {
  const distance = calculateTotalDistance();
  const speed = routeConfig.value.autoFlightSpeed || 10; // 默认10m/s
  if (speed <= 0) return 0;
  
  // 计算飞行时间（秒）
  const flightTime = distance / speed;
  console.log('flightTime', flightTime);
  // 遍历所有航点计算动作时间
  let actionTime = 0;
  
  // 安全检查：确保waypoints.value存在且是数组
  if (!waypoints.value || !Array.isArray(waypoints.value)) {
    return flightTime;
  }
  
  waypoints.value.forEach(waypoint => {
    // 安全检查：确保actionGroupList存在且是数组
    if (!waypoint?.actionGroupList || !Array.isArray(waypoint.actionGroupList)) {
      return;
    }
    
    waypoint.actionGroupList.forEach(group => {
      // 安全检查：确保actions存在且是数组
      if (!group?.actions || !Array.isArray(group.actions)) {
        return;
      }
      
      group.actions.forEach(action => {
        // 根据动作类型计算时间
        switch (action?.type) {
          case ActionType.PHOTO: // 拍照
            actionTime += 2;
            break;
          case ActionType.PANO_SHOT: // 全景拍照
            actionTime += 50;
            break;
          case ActionType.ORIENTED_SHOOT: // 定向拍照
            actionTime += 3.5;
            break;
          case ActionType.START_RECORD: // 开始录像
          case ActionType.STOP_RECORD: // 停止录像
            actionTime += 1;
            break;
          case ActionType.HOVER_TIME: // 悬停动作，获取value值
            if (action?.value) {
              actionTime += action.value * 1;
            }
            break;
          // 其他动作类型不计算时间
        }
      });
    });
  });
  
  // 总时间 = 飞行时间 + 动作时间
  const totalTimeInSeconds = flightTime + actionTime;
  return totalTimeInSeconds;
};

// 计算照片数量
const calculatePhotoCount = () => {
  let photoCount = 0;
  
  // 安全检查：确保waypoints.value存在且是数组
  if (!waypoints.value || !Array.isArray(waypoints.value)) {
    return photoCount;
  }
  
  waypoints.value.forEach(waypoint => {
    // 安全检查：确保actionGroupList存在且是数组
    if (!waypoint?.actionGroupList || !Array.isArray(waypoint.actionGroupList)) {
      return;
    }
    
    waypoint.actionGroupList.forEach(group => {
      // 安全检查：确保actions存在且是数组
      if (!group?.actions || !Array.isArray(group.actions)) {
        return;
      }
      
      group.actions.forEach(action => {
        // 统计拍照相关的动作
        if (action?.type === ActionType.PHOTO || 
            action?.type === ActionType.PANO_SHOT || 
            action?.type === ActionType.ORIENTED_SHOOT) {
          photoCount++;
        }
      });
    });
  });
  
  return photoCount;
};

// 动态航线统计信息
const routeStats = computed(() => {
  return {
    distance: calculateTotalDistance(),
    time: calculateFlightTime(),
    waypointCount: waypoints.value.length,
    materialCount: calculatePhotoCount()
  };
});

// 面状航线统计信息
const polygonRouteStats = ref(null);

// 综合统计信息（根据模式选择）
const combinedRouteStats = computed(() => {
  // 如果是面状航线模式且有面状航线统计信息，使用面状航线统计
  if ((routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol') && 
      polygonRouteStats.value) {
    return {
      area: polygonRouteStats.value.surveyArea || 0,
      distance: polygonRouteStats.value.totalDistance || 0,
      time: polygonRouteStats.value.flightTime || 0,
      materialCount: polygonRouteStats.value.photoCount// 面状航线中每个航点都拍照
    };
  }
  
  // 其他模式使用普通航线统计
  return routeStats.value;
});

// 格式化点数据，确保包含 lat/lng 属性
const formatPoints = (points) => {
  if (!points || !Array.isArray(points)) return [];
  return points.map(p => ({
    ...p,
    lat: p.lat !== undefined ? p.lat : p.latitude,
    lng: p.lng !== undefined ? p.lng : p.longitude
  }));
};

// 监听routeStats变化，同步更新到routeConfig
watch(routeStats, (newStats) => {
  // 更新routeConfig中的距离和时间字段
  routeConfig.value.distance = newStats.distance;
  routeConfig.value.time = newStats.time;
}, { immediate: true });

// 航线配置数据已整合到routeConfig对象中

// 任务创建确认处理函数
const onMissionCreated = (config) => {
  // 暂时隐藏地图，等待布局更新
  isDataLoaded.value = false;

  if(config.deviceSn){
    let device = deviceOptions.value.find(item => item.deviceSn === config.deviceSn);
    if(device){
      center.value.lat = device.latitude * 1;
      center.value.lng = device.longitude * 1;
    }
  }
  console.log("任务创建确认处理函数：", config , 'center' ,center);
  
  // 更新任务配置
  routeConfig.value = { ...routeConfig.value, ...config };
  showCreateModal.value = false;

  // 检查起飞点是否存在
  if (!routeConfig.value.takeOffRefPoint) {
    // 显示航线配置菜单
    if (routeConfig.value.templateType === 'waypoint') {
       routeConfigVisible.value = true;
    }
    // 显示提示框
    showTakeoffHint.value = true;
    handleSetTakeoffPoint()
  }

  // 延迟重新加载地图，确保DOM布局（侧边栏显隐）已稳定
  setTimeout(() => {
    isDataLoaded.value = true;
  }, 300);
};

// 键盘按钮处理
const handleKeyboard = () => {
  ElMessage.info('键盘功能开发中');
};

// 切换航线配置弹窗显示/隐藏
const toggleRouteConfig = () => {
  routeConfigVisible.value = !routeConfigVisible.value;
};

// 保存航线配置
const handleRouteConfigSave = (configData) => {
  // 更新路由配置数据
  routeConfig.value = { ...configData };
  console.log("保存航线配置：", routeConfig.value);
  routeConfigVisible.value = false;
  ElMessage.success('航线配置已保存');
};

// 取消航线配置
const handleRouteConfigCancel = () => {
  console.log("取消航线配置");
  routeConfigVisible.value = false;
};

// 起飞点设置状态
const isSettingTakeoffPoint = ref(false);

// 起飞点数据结构转换：字符串转对象
const parseTakeoffPoint = (pointStr) => {
  if (!pointStr) return null;
  const [lat, lng, height] = pointStr.split(',').map(Number);
  return { lat, lng, height };
};

// 起飞点数据结构转换：对象转字符串
const formatTakeoffPoint = (pointObj) => {
  if (!pointObj || !pointObj.lat || !pointObj.lng) return null;
  return `${pointObj.lat.toFixed(6)},${pointObj.lng.toFixed(6)},${pointObj.height || 0}`;
};

// 设置起飞点 - 进入设置模式
const handleSetTakeoffPoint = () => {
  isSettingTakeoffPoint.value = true;
  ElMessage.info('请在地图上点击设置起飞点');
};

// 重置起飞点
const handleResetTakeoffPoint = () => {
  routeConfig.value.takeOffRefPoint = null;
  // 重置后直接进入设置起飞点模式
  isSettingTakeoffPoint.value = true;
  ElMessage.info('请在地图上重新点击设置起飞点');
};

// 反转航点
const reverseWaypoints = () => {
  waypoints.value.reverse();
  ElMessage.success('航点顺序已反转');
};

// 处理地图点击事件
const handleMapClick = (coords) => {
  // 检查是否处于设置起飞点模式，或系统没有起飞点且首次点击
  if (isSettingTakeoffPoint.value || !routeConfig.value.takeOffRefPoint) {
    // 创建起飞点对象
    const takeoffPoint = {
      lat: coords.lat,
      lng: coords.lng,
      height: coords.height || routeConfig.value.globalHeight || 0 // 优先使用地图点击获取的高度，其次是全局高度，最后是默认0米
    };
    // 转换为字符串格式保存
    routeConfig.value.takeOffRefPoint = formatTakeoffPoint(takeoffPoint);
    // 退出设置模式
    isSettingTakeoffPoint.value = false;
    ElMessage.success('起飞点已设置');
    return;
  }
  
  // 普通航点添加逻辑
  // 创建新的航点对象
  const newWaypoint = {
    id: Date.now(),
    routePointIndex: waypoints.value.length,
    longitude: coords.lng,
    latitude: coords.lat,
    lat: coords.lat,
    lng: coords.lng,
    height: routeConfig.value.globalHeight || 100, // 使用全局高度或默认100米
    ellipsoidHeight: coords.height || 100, // 从地图点击事件获取高度，默认0米
    speed: routeConfig.value.autoFlightSpeed || 10, // 使用全局速度或默认10m/s
    actionGroupList: [
      {
        actionGroupId: waypoints.value.length,
        actionGroupStartIndex: waypoints.value.length,
        actionGroupEndIndex: waypoints.value.length,
        actionTriggerType: 'reachPoint', // 默认自动触发动作
        actions: []
      }
    ]
  };
  
  // 添加航点到列表
  waypoints.value.push(newWaypoint);
  
  // 默认选中最新添加的航点
  selectedWaypoint.value = newWaypoint;
  selectedActionIndex.value = null; // 空值表示选中第一个动作
  
  ElMessage.success(`已添加航点 ${waypoints.value.length}`);
};

// 处理添加航点 - 默认选中最新航点
const handleAddWaypoint = (newWaypoint) => {
  // 直接使用来自MapContainer的完整航点对象
  waypoints.value.push(newWaypoint);
  
  // 默认选中最新添加的航点
  selectedWaypoint.value = newWaypoint;
  selectedActionIndex.value = null; // 空值表示选中第一个动作
  
  // 选中第一个动作
  if (newWaypoint.actionGroupList[0].actions.length > 0) {
    selectedAction.value = JSON.parse(JSON.stringify(newWaypoint.actionGroupList[0].actions[0]));
  }
};

// 处理航点点击事件
const handleWaypointClick = (waypoint, index) => {
  // 更新选中的航点
  selectedWaypoint.value = waypoint;
  selectedActionIndex.value = null; // 空值表示选中第一个动作
  
  // 选中第一个动作
  if (waypoint.actionGroupList[0].actions.length > 0) {
    selectedAction.value = JSON.parse(JSON.stringify(waypoint.actionGroupList[0].actions[0]));
  }
};

// 选择动作
const selectAction = (waypoint, action, index) => {
  selectedWaypoint.value = waypoint;
  selectedActionIndex.value = index;
  selectedAction.value = JSON.parse(JSON.stringify(action));
};

// 编辑航点
const editWaypoint = (waypoint) => {
  // 编辑航点逻辑
  ElMessage.info('编辑航点功能开发中');
};

// 删除航点
const deleteWaypoint = async (index) => {
  try {
    // 检查当前选中的航点索引
    const currentSelectedIndex = selectedWaypoint.value ? 
      waypoints.value.findIndex(wp => wp.id === selectedWaypoint.value.id) : -1;
    
    // 直接删除数据中的航点，地图会自动监听数据变化更新视图
    waypoints.value.splice(index, 1);
    
    // 使用统一的修正索引方法
    fixWaypointIndexes();
    
    ElMessage.success('航点已删除');
    
    // 更新选中航点逻辑
    if (waypoints.value.length === 0) {
      // 如果数据空了，清空选中航点数据
      selectedWaypoint.value = null;
      selectedAction.value = null;
      selectedActionIndex.value = null;
    } else if (currentSelectedIndex !== -1) {
      // 如果之前有选中航点
      if (currentSelectedIndex === index) {
        // 如果删除的是当前选中的航点
        if (waypoints.value.length > index) {
          // 如果长度足够，选中原来的索引位置（删除后该位置会有新数据）
          selectedWaypoint.value = waypoints.value[index];
        } else {
          // 如果长度不足，变成最后一个数据
          selectedWaypoint.value = waypoints.value[waypoints.value.length - 1];
        }
        // 清空动作选中状态
        selectedAction.value = null;
        selectedActionIndex.value = null;
      } else if (currentSelectedIndex > index) {
        // 如果选中的航点在删除的航点之后，索引需要减1
        selectedWaypoint.value = waypoints.value[currentSelectedIndex - 1];
      }
      // 如果选中的航点在删除的航点之前，不需要更新选中状态
    }
  } catch (error) {
    ElMessage.error('删除航点失败');
  }
};

// 处理删除动作（从WaypointList组件触发）
const handleDeleteAction = (waypoint, index) => {
  if (waypoint && waypoint.actionGroupList && index !== undefined) {
    waypoint.actionGroupList[0].actions.splice(index, 1);
    ElMessage.success('动作已删除');
    
    // 如果删除的是当前选中的动作，更新选中状态
    if (selectedWaypoint.value && selectedWaypoint.value.id === waypoint.id && selectedActionIndex.value === index) {
      selectedAction.value = null;
      selectedActionIndex.value = null;
    }
  }
};

// 处理删除航点（从MapViewer组件触发）
const handleDeletePoint = async (eventData) => {
  console.log('handleDeletePoint ====>', eventData);
  if (eventData && eventData.waypoint && eventData.index !== undefined) {
    await deleteWaypoint(eventData.index);
  }
};

// 处理鼠标左键点击（在设置起飞点模式下）
const handleLeftClick = (coords) => {
  // 只有在设置起飞点模式下才处理左键点击
  if (isSettingTakeoffPoint.value) {
    // 创建起飞点对象
    const takeoffPoint = {
      lat: coords.lat,
      lng: coords.lng,
      height: coords.height || routeConfig.value.globalHeight || 0 // 优先使用地图点击获取的高度，其次是全局高度，最后是默认0米
    };
    // 转换为字符串格式保存
    routeConfig.value.takeOffRefPoint = formatTakeoffPoint(takeoffPoint);
    // 退出设置模式
    isSettingTakeoffPoint.value = false;
    ElMessage.success('起飞点已设置');
  }
};

// 从面板删除动作
const deleteActionFromPanel = () => {
  if (selectedWaypoint.value && selectedActionIndex.value !== null) {
    selectedWaypoint.value.actionGroupList[0].actions.splice(selectedActionIndex.value, 1);
    // 关闭设置面板
    selectedAction.value = null;
    selectedWaypoint.value = null;
    selectedActionIndex.value = null;
    ElMessage.success('动作已删除');
  }
};

// 处理从动作面板添加的动作
const handleAddActionFromPanel = ({ action, actionType }) => {
  // 使用当前选中的航点
  const waypoint = selectedWaypoint.value;
  if (!waypoint) {
    ElMessage.warning('请先选中一个航点');
    return;
  }
  
  // 将动作添加到当前选中航点的动作列表尾部
  waypoint.actionGroupList[0].actions.push(action);
  
  // 选中最后添加的动作
  const lastActionIndex = waypoint.actionGroupList[0].actions.length - 1;
  selectedAction.value = JSON.parse(JSON.stringify(action));
  selectedActionIndex.value = lastActionIndex;
};

// 更新动作值
const updateActionValue = (value) => {
  if (selectedAction.value && selectedWaypoint.value && selectedActionIndex.value !== null) {
    const type = selectedAction.value.type;
    // 更新本地选中的动作对象
    selectedAction.value.value = value;
    selectedAction.value[type] = value;
    
    // 直接更新到航点数据中，无需保存按钮 
    selectedWaypoint.value.actionGroupList[0].actions[selectedActionIndex.value] = JSON.parse(JSON.stringify(selectedAction.value));
  }
};

// 获取动作最小值
const getActionMinValue = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig('default', type);
  return config.min;
};

// 获取动作最大值
const getActionMaxValue = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig('default', type);
  return config.max;
};

// 获取动作默认值
const getActionDefaultValue = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig('default', type);
  return config.defaultValue;
};

// 获取动作步长
const getActionStep = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig('default', type);
  return config.step;
};

// 返回按钮处理
const handleBack =  async () => {
  await message.confirm('确定要返回吗？')
  router.push({
    path: "/wayline/list",
  })
};

// 修正航点数据索引
const fixWaypointIndexes = () => {
  // 安全检查：确保waypoints.value存在且是数组
  if (!waypoints.value || !Array.isArray(waypoints.value)) {
    return;
  }
  
  waypoints.value.forEach((waypoint, index) => {
    // 修正 routePointIndex
    waypoint.routePointIndex = index;
    
    // 修正 actionGroupList 中的索引字段
    if (waypoint.actionGroupList && waypoint.actionGroupList.length > 0) {
      waypoint.actionGroupList.forEach(group => {
        group.actionGroupId = index;
        group.actionGroupStartIndex = index;
        group.actionGroupEndIndex = index;
        
        // 修正 actions 数组中的 actionIndex，确保顺序连续
        if (group.actions && group.actions.length > 0) {
          group.actions.forEach((action, actionIndex) => {
            action.actionIndex = actionIndex;
          });
        }
      });
    }
  });
};

// 将 waypoints 转换为样例数据的 routePointList 格式
const convertWaypointsToRoutePointList = () => {
  // 先修正索引
  fixWaypointIndexes();
  
  return waypoints.value.map((waypoint, index) => {
    return {
      routePointIndex: index,
      longitude: waypoint.longitude,
      latitude: waypoint.latitude,
      lat: waypoint.latitude,
      lng: waypoint.longitude,
      speed: waypoint.speed,
      height: waypoint.height,
      ellipsoidHeight: waypoint.ellipsoidHeight,
      actionGroupList: waypoint.actionGroupList
    };
  });
};

// 保存按钮处理 - 生成完整的航线数据
const handleSave = async  () => {
  // 生成完整的航线数据
  const fullRouteData = {
    ...routeConfig.value,
    routePointList: [],
    coordinates: [],
    coordinatesOri: [],
    routePointListOri: [],
  };

  // 注入统计数据 (Area, Length, Time, Photos)
  if (combinedRouteStats.value) {
    fullRouteData.area = combinedRouteStats.value.area || 0;
    fullRouteData.totalLength = combinedRouteStats.value.distance || 0;
    fullRouteData.totalTime = combinedRouteStats.value.time || 0;
    fullRouteData.photoCount = combinedRouteStats.value.materialCount || 0;
    
    // 同时更新 routeConfig 中的基础字段
    fullRouteData.distance = combinedRouteStats.value.distance || 0;
    fullRouteData.time = combinedRouteStats.value.time || 0;
  }

  // 计算 GSD (仅针对建图/巡逻模式)
  if (isPatrolMode.value) {
    try {
      const height = routeConfig.value.globalHeight || 50;
      const camera = CAMERA_PRESETS[routeConfig.value.aircraftModel] || CAMERA_PRESETS.m4td;
      if (camera) {
        // GSD (m/px) = (height * sensorWidth) / (focalLength * imageWidth)
        // sensorWidth (mm), focalLength (mm), height (m)
        const gsdMeters = (height * camera.sensorWidth) / (camera.focalLength * camera.imageWidth);
        // Convert to cm/px
        fullRouteData.gsd = (gsdMeters * 100).toFixed(2);
      }
    } catch (e) {
      console.error("Error calculating GSD", e);
    }
  }

  let Waypoint = convertWaypointsToRoutePointList()
  // 如果是建图航线 那么清理数据
  if(routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'mapping3d'){
    // 整理数据 正射下  routePointList 存储 弓形航线数据  coordinates 存储 边框数据 

    fullRouteData.routePointList = coordinates.value.map(coord => ({...coord,
      routePointIndex: coord.index,
      longitude: coord.lng,
      latitude: coord.lat,
      height: routeConfig.value.globalHeight || 200,
      ellipsoidHeight: coord.height || routeConfig.value.globalHeight,
      waypointHeadingMode: "followWayline"
    }))


    fullRouteData.coordinates = Waypoint.map(item => ({
      longitude: item.longitude,
      latitude: item.latitude,
    }))

    
    // 原始数据 coordinatesOri 原始的边框数据  routePointListOri 原始的航点数据
    fullRouteData.coordinatesOri = coordinates.value
    fullRouteData.routePointListOri = Waypoint
  }else{
    fullRouteData.routePointList = Waypoint
  }
  

  // 校验航线名称是否为空
  if (!fullRouteData.fileName) {
    ElMessage.error('航线名称不能为空');
    return;
  }

  // todo 检验 校验航线重名
  try{
    if(!isEdit.value){

      // 校验航线重名
      let checkRes = await WaylineFileApi.checkWaylineFileName(fullRouteData.fileName)
      if(checkRes){
        ElMessage.error('航线名称已存在，请修改后重试');
        handleEditMission();
        return;
      }

      // 创建航线
      let res = await WaylineFileApi.createWaylineFile(fullRouteData)
      console.log('航线创建成功', res)
      ElMessage.success('航线创建成功');  
      wayLineId.value = res.id
      isEdit.value = true
    }else{
      // 更新航线
      await WaylineFileApi.updateWaylineFile({
        id: wayLineId.value,
        kmzInfo:fullRouteData
      })
      ElMessage.success('航线保存成功');
    }
    console.log('完整航线数据:', fullRouteData);
  }catch(error){
    ElMessage.error('航线保存失败', error);
  }
  
  
};

// 设置按钮处理
const handleSettings = () => {
  ElMessage.info('设置功能开发中');
};

// 编辑任务处理函数
const handleEditMission = () => {
  showCreateModal.value = true;
};


// 核心生成函数（静默生成，不显示提示）
const isGeneratingRoute = ref(false);

const generatePolygonRouteInternal = (showAlert = false) => {
  if (waypoints.value.length < 3) {
    if (showAlert) {
      message.alert('至少需要 3 个边界点才能生成面状航线');
    }
    coordinates.value = [];
    polygonRouteStats.value = null;
    return false;
  }
  
  isGeneratingRoute.value = true;
  
  try {
    
    // 准备生成选项
    const options = {
      height: routeConfig.value.globalHeight || 50,
      speed: routeConfig.value.autoFlightSpeed || 10,
      angle: routeConfig.value.mappingTypeReq?.direction || 0,
      margin: routeConfig.value.mappingTypeReq?.margin || 0,
      optimizePath: true, // 默认开启
      elevationOptimizeEnable: routeConfig.value.mappingTypeReq?.elevationOptimizeEnable || 0,
      overlapRate: parseFloat(((routeConfig.value.mappingTypeReq?.orthoCameraOverlapW || 70) / 100).toFixed(1)),
      autoAngleOptimize: routeConfig.value.mappingTypeReq?.autoAngleOptimize // 航点变化变成 true，角度变化 为 false
    };
    console.log('生成选项 polygonConfig====>:',options);
    // 判断间距计算方式
    options.camera = CAMERA_PRESETS.m4td;
    
    console.log('生成选项:', options, waypoints.value);
    
    // 生成航线
    const generatedPath = generatePolygonRoute(waypoints.value, options);
    
    if (generatedPath.length === 0) {
      if (showAlert) {
        message.alert('生成失败：未能生成有效航线，请检查参数设置');
      }
      coordinates.value = [];
      polygonRouteStats.value = null;
      return false;
    }
    
    // 检查是否包含优化后的主航角信息
    const optimizedAngleInfo = generatedPath.find(point => point.isOptimizedAngle);
    if (optimizedAngleInfo) {
      // 更新routeConfig中的主航角
      if (!routeConfig.value.mappingTypeReq) {
        routeConfig.value.mappingTypeReq = {};
      }
      routeConfig.value.mappingTypeReq.direction = optimizedAngleInfo.optimizedAngle;
      console.log('📌 更新UI主航角为优化后的值:', optimizedAngleInfo.optimizedAngle.toFixed(2), '度');
      
      // 移除优化角度信息，只保留实际航点
      coordinates.value = generatedPath.filter(point => !point.isOptimizedAngle);
    } else {
      coordinates.value = generatedPath;
    }
    
    polygonRouteStats.value = calculateRouteStats(coordinates.value, waypoints.value, {
      height: routeConfig.value.globalHeight,
      camera: CAMERA_PRESETS[routeConfig.value.aircraftModel] || CAMERA_PRESETS.m4td,
      overlapRate: parseFloat(((routeConfig.value.mappingTypeReq?.orthoCameraOverlapH || 80) / 100).toFixed(1))
    });
    console.log('生成完成 | polygonRouteStats.value:', polygonRouteStats.value);
    console.log('生成完成 |', {
      航点数: generatedPath.length,
      航程: polygonRouteStats.value.totalDistance + 'm',
      时间: Math.ceil(polygonRouteStats.value.flightTime / 60) + '分钟'
    });
    
    if (showAlert) {
      message.alert(`航线生成成功！\n航点数: ${generatedPath.length}\n航程: ${polygonRouteStats.value.totalDistance}m\n预计时间: ${Math.ceil(polygonRouteStats.value.flightTime / 60)}分钟`);
    }
    
    return true;
  } catch (error) {
    console.error('生成面状航线失败:', error);
    if (showAlert) {
      message.alert('生成失败: ' + error.message);
    }
    coordinates.value = [];
    polygonRouteStats.value = null;
    return false;
  } finally {
    // 延迟2秒关闭，提升用户体验
    setTimeout(() => {
      isGeneratingRoute.value = false;
    }, 2000);
  }
};

// 手动生成（带提示）
const handleGeneratePolygonRoute = () => {
  generatePolygonRouteInternal(true);
};

// 防抖定时器
let autoGenerateTimer = null;

// 正在初始化数据标记
const isDataLoaded = ref(false);

// 自动生成航线（实时响应，带防抖）
watch(
  [
    waypoints,
    () => routeConfig.value.templateType,
    () => routeConfig.value.globalHeight,
    () => routeConfig.value.autoFlightSpeed,
    () => routeConfig.value.polygonRoute,
    () => routeConfig.value.scanSetting,
    () => routeConfig.value.mappingTypeReq?.direction, 
    () => routeConfig.value.mappingTypeReq?.margin,
    () => routeConfig.value.mappingTypeReq?.elevationOptimizeEnable,
  ],
  () => {
    // 清除之前的定时器
    if (autoGenerateTimer) {
      clearTimeout(autoGenerateTimer);
    }
    
    if (routeConfig.value.templateType === 'mapping2d') {
      console.log('自动生成航线 ');
      // 面状航线：自动生成（300ms 防抖）
      autoGenerateTimer = setTimeout(() => {
        generatePolygonRouteInternal(false);
      }, 300);
    } else if (routeConfig.value.templateType === 'patrol') {
      // 巡逻模式：使用旧的简单扫描（即时生成） todo 巡逻模式没有适配

      if (waypoints.value.length >= 3) {
        const height = routeConfig.value.globalHeight;
        const overlap = routeConfig.value.scanSetting?.overlap || 20;
        const spacing = 20 * (1 - overlap / 100);

        coordinates.value = generateScanPath(
          waypoints.value,
          spacing,
          routeConfig.value.scanSetting?.angle || 0,
          routeConfig.value.scanSetting?.margin || 0
        );

        // Calculate stats
        const formattedCoordinates = formatPoints(coordinates.value);
        const formattedWaypoints = formatPoints(waypoints.value);

        polygonRouteStats.value = calculateRouteStats(formattedCoordinates, formattedWaypoints, {
            height: routeConfig.value.globalHeight,
            camera: CAMERA_PRESETS[routeConfig.value.aircraftModel] || CAMERA_PRESETS.m4td,
            overlapRate: parseFloat(((routeConfig.value.scanSetting?.overlap || 20) / 100).toFixed(1))
        });
      } else {
        coordinates.value = [];
        polygonRouteStats.value = null;
      }
    } else {
      // 其他模式：清空航线
      coordinates.value = [];
      routeStats.value = null;
    }
  },
  { deep: true }
);

const missionStats = computed(() => {
  const points = (routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol')
    ? coordinates.value
    : waypoints.value;

  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const R = 6378137;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance += R * c;
  }

  let area = 0;
  if ((routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol') && waypoints.value.length >= 3) {
    area = getPolygonArea(waypoints.value);
  }

  return {
    distance: distance,
    time: distance / (routeConfig.value.autoFlightSpeed || 5),
    waypointCount: points.length,
    area: area
  };
});
// 生成 KMZ 文件
const handleGenerateKMZ = async () => {
  try {
    const pointsToUse = (routeConfig.value.templateType === 'mapping2d' || routeConfig.value.templateType === 'patrol')
      ? coordinates.value
      : waypoints.value;

    const kmzBlob = await generateKMZ(routeConfig.value, pointsToUse, waypoints.value);
    const url = URL.createObjectURL(kmzBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeConfig.value.fileName}.kmz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Generate KMZ failed', e);
    message.alert('生成 KMZ 失败: ' + e.message);
  }
};

</script>

<style scoped lang="scss">


@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.route-planning-container {
  display: flex;
  flex-direction: column;
  width: calc(100% + 32px); // 補償 el-main 的 padding
  height: calc(100% + 32px); // 補償 el-main 的 padding
  margin: -16px; // 補償 el-main 的 padding
  overflow: hidden;
  background-color: #fff;
}

// 主體區域 - flex水平分佈
.route-planning-body {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.loading-container {
  display: flex;
  width: 100%;
  background-color: #f0f2f5;
  flex: 1;
  align-items: center;
  justify-content: center;
}

// 中間地圖區域 - 彈性寬度
.map-area {
  position: relative;
  height: 100%;
  min-width: 0;
  flex: 1;
  background-color: #f0f2f5;
  overflow: hidden;
}

// 右側動作設置容器 - 固定寬度300px，flex垂直分布
.action-setting-container {
  display: flex;
  width: 320px;
  overflow: hidden;
  background-color: #fff;
  border-left: 1px solid #e8e8e8;
  flex-direction: column;
  flex-shrink: 0;
}

// 右键菜单样式
.context-menu {
  position: fixed;
  z-index: 10000;
  padding: 4px 0;
  color: #333;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
  
  ::v-deep(.el-menu) {
    background-color: transparent;
    border: none;
  }
  
  ::v-deep(.el-menu-item) {
    height: 36px;
    line-height: 36px;
    color: #333;
    
    &:hover {
      background-color: #ecf5ff;
    }
  }
}

// 起飞点提示框样式
.takeoff-hint-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 5000;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  pointer-events: none; // 允许点击穿透，不阻止地图交互
}

.takeoff-hint-content {
  padding: 20px 30px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  text-align: center;
  background-color: rgb(0 0 0 / 60%);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 30%);
  animation: fadeIn 0.3s ease-out;
}

// 航线配置弹窗
.route-config-content {
  .config-section {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
    }
  }
  
  .config-item {
    display: flex;
    margin-bottom: 12px;
    align-items: center;
    gap: 12px;
    
    .label {
      width: 80px;
      font-weight: 600;
    }
  }
}

// 调试控制面板样式
.debug-control-panel {
  padding: 12px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgb(0 0 0 / 5%);
}

.control-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-item label {
  min-width: 80px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.control-item input[type="range"] {
  flex: 1;
  max-width: 300px;
}

.control-info {
  min-width: 100px;
  font-size: 14px;
  color: #606266;
}

// 整体页面布局 - flex垂直分布
</style>

