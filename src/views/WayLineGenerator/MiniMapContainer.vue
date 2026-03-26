<template>
  <div class="drone-camera-view-container" :class="{ 'is-transparent': isTransparent }">
    <div class="view-header" v-if="debugMode">
      <div class="camera-info">
        <span class="info-item">高度: {{ droneInfo.height.toFixed(1) }}m</span>
        <span class="info-item">俯仰角: {{ props.dronePitch }}°</span>
        <span class="info-item">偏航角: {{ props.droneYaw }}°</span>
      </div>
    </div>
    
    <div class="cesium-viewer-wrapper">
      <vc-viewer 
        ref="droneViewer"
        @ready="onViewerReady"
        :animation="false"
        :timeline="false"
        :base-layer-picker="false"
        :fullscreen-button="false"
        :geocoder="false"
        :home-button="false"
        :scene-mode-picker="false"
        :selection-indicator="false"
        :info-box="false"
        :scene-mode="3"
        :scene-3d-only="true"
        :camera="droneCamera"
        v-bind="props.extraViewerOptions"
        @map-move-end="onMapMoveEnd"
      >
        <!-- 无人机位置标记 -->
        <vc-entity :position="dronePosition">
          <vc-graphics-point
            :pixelSize="15"
            :color="'#ff6b6b'"
            :outlineColor="'white'"
            :outlineWidth="3"
          />
          <vc-graphics-label
            :text="'无人机'"
            :font="'12px sans-serif'"
            :pixel-offset="[0, -25]"
            :fillColor="'white'"
            :outlineColor="'#333'"
            :outlineWidth="2"
          />
        </vc-entity>
        
        <!-- 相机视角指示线 -->
        <vc-entity>
          <vc-graphics-polyline
            :positions="cameraViewLine"
            :material="'#ff6b6b'"
            :width="2"
            :dash-pattern="[8, 4]"
          />
        </vc-entity>
        
        <!-- 选中航点标记 -->
        <vc-entity v-if="selectedWaypoint" :position="selectedWaypointPosition">
          <vc-graphics-point
            :pixelSize="15"
            :color="'#4ecdc4'"
            :outlineColor="'white'"
            :outlineWidth="3"
          />
          <vc-graphics-label
            :text="'选中航点'"
            :font="'12px sans-serif'"
            :pixel-offset="[0, -25]"
            :fillColor="'white'"
            :outlineColor="'#333'"
            :outlineWidth="2"
          />
        </vc-entity>
      </vc-viewer>
    </div>
    
    <!-- 调试面板暂时注释掉，因为角度数据现在直接从props获取，不允许在子组件中修改 -->
    <!-- <div class="control-panel" v-if="debugMode">
      <div class="control-group">
        <label>高度</label>
        <el-slider 
          v-model="droneInfo.height" 
          :min="50" 
          :max="500" 
          @change="updateCameraView"
        />
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElSlider } from 'element-plus'
import {
  getCesiumHPRFromDjiSpecifications,
  CreateFrustum,
  createDroneArrowEntity,
  djiYawToCesiumHeading,
  convertDjiToCesiumAngles
} from "./hooks/helper.ts";
import { ActionType } from "@/types/device.ts";

// 组件属性
const props = defineProps({
  selectedWaypoint: {
    type: Object,
    default: null
  },
  waypoints: {
    type: Array,
    default: () => []
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
  droneZoom: {
     type: Object,
    default: () => ({
      zoom: 1,
      zoomMin: 1,
      zoomMax: 112
    })
  },
  droneFOV: {
    type: Number,
    default: 60 // 默认视场角
  },
  terrainProvider: {
    type: Object,
    default: null
  },
  // 新增：是否背景透明（用于AR模式）
  isTransparent: {
    type: Boolean,
    default: false
  },
  // 新增：额外的Viewer配置项
  extraViewerOptions: {
    type: Object,
    default: () => ({})
  }
})

// 响应式数据
const droneViewer = ref(null)
let cesiumInstance = null
let viewerInstance = null

// 天地图API密钥
const apiKeys = [
  '1ae257dc274381bc5f14e3e8b8957312',
  '6519adb5c95e116ccef862284932b551',
  '08588d4ad5b078b22b6727eaab32e60a',
  '607b3eb7e11ce7a2676178b599bbeb16',
  '1c11ee425cb9824fa5011d052c72b6d5',
  'dfdaeaee8b34d13ffc3de3658a84f66a',
  'ee6077be753f24382d1c19c8484bf82c'
]

// 无人机信息 - 只保留需要的字段，角度信息直接从props获取
const droneInfo = ref({
  longitude: 126.623688707,
  latitude: 45.720453839,
  height: 271.135443760376
})

// 无人机模型URL（使用内置模型或自定义URL）
// const droneModelUrl = ref('https://zouyaoji.top/vue-cesium/SampleData/models/CesiumDrone.glb')

import droneModelUrl from "@/assets/svgs/yaw-mode-drone.svg";

// 计算无人机位置
const dronePosition = computed(() => {
  return {
    lng: props.selectedWaypoint?.longitude || droneInfo.value.longitude,
    lat: props.selectedWaypoint?.latitude || droneInfo.value.latitude,
    height: props.selectedWaypoint?.height || droneInfo.value.height
  }
})

// 选中航点位置
const selectedWaypointPosition = computed(() => {
  if (!props.selectedWaypoint) return null
  return {
    lng: props.selectedWaypoint.longitude,
    lat: props.selectedWaypoint.latitude,
    height: props.selectedWaypoint.height
  }
})

// 计算无人机偏航角（弧度）
const droneHeading = computed(() => {
  return cesiumInstance?.Math?.toRadians(props.droneYaw || 0) || 0
})

// 计算无人机俯仰角（弧度）
const dronePitchRad = computed(() => {
  return cesiumInstance?.Math?.toRadians(props.dronePitch || 0) || 0
})

// 更新相机视图
const updateCameraView = () => {
  try{
    if (!viewerInstance || !cesiumInstance || !props.selectedWaypoint) return
    
    const camera = viewerInstance.camera
    const position = dronePosition.value
    
    // 直接使用props传递的角度数据
    const yaw = props.droneYaw || 0;
    const pitch = props.dronePitch || 0;
    
    // 使用flyTo方法平滑过渡到新位置
    camera.flyTo({
      destination: cesiumInstance.Cartesian3.fromDegrees(
        position.lng,
        position.lat,
        position.height
      ),
      orientation: {
        heading: cesiumInstance.Math.toRadians(yaw), // Cesium中0度朝东
        pitch: cesiumInstance.Math.toRadians(pitch),
        roll: 0.0
      },
      duration: 0.5
    })
  }catch(err){
    console.warn('updateCameraView ',err)
  }
}

// 计算相机视角线
const cameraViewLine = computed(() => {
  const startPos = dronePosition.value
  if (!startPos) return []
  
  // 根据俯仰角和偏航角计算视线方向
  const distance = 200 // 视线长度
  const heading = props.droneYaw || 0
  const pitch = props.dronePitch || 0
  
  // 将角度转换为弧度
  const headingRad = (heading + 90) * Math.PI / 180 // Cesium中0度朝东，转换为朝北为0度
  const pitchRad = -pitch * Math.PI / 180
  
  // 计算终点坐标
  const endPos = calculateEndPosition(
    startPos.lng, startPos.lat, startPos.height,
    distance, headingRad, pitchRad
  )
  
  return [startPos, endPos]
})

// 计算相机位置和朝向
const droneCamera = computed(() => {
  // 只在cesiumInstance准备好时返回camera配置，否则返回null
  if (!cesiumInstance) {
    return null
  }
  
  // 获取当前无人机位置和角度
  const position = dronePosition.value
  const heading = props.droneYaw || 0
  const pitch = props.dronePitch || -90
  const roll = props.droneRoll || 0
  
  return {
    position: position,
    heading: heading + 90, // Cesium中0度朝东，转换为朝北为0度
    pitch: pitch, // 负角度表示向下看
    roll: roll
  }
})

// 从选中航点更新无人机数据
watch(() => props.selectedWaypoint, (newWaypoint) => {
  if (newWaypoint) {
    droneInfo.value = {
      longitude: newWaypoint.longitude || 126.623688707,
      latitude: newWaypoint.latitude || 45.720453839,
      height: newWaypoint.height || 271.135443760376
    }
    
    // 直接更新相机视图到新航点位置
    updateCameraView()
  }
}, { deep: true, immediate: true })

// 监听航点数组变化，更新地图中心
watch(() => props.waypoints, () => {
  // 如果有选中的航点，更新相机位置
  if (props.selectedWaypoint) {
    updateCameraView()
  } 
  // 如果没有选中的航点但有航点数据，更新到第一个航点位置
  else if (props.waypoints.length > 0) {
    const firstWaypoint = props.waypoints[0]
    if (firstWaypoint) {
      droneInfo.value = {
        longitude: firstWaypoint.longitude || 126.623688707,
        latitude: firstWaypoint.latitude || 45.720453839,
        height: firstWaypoint.height || 271.135443760376
      }
      updateCameraView()
    }
  }
}, { deep: true })

// 监听相机位置、朝向和FOV变化，实时更新
watch([droneCamera, () => props.droneFOV], ([newCamera, newFOV]) => {
  if (viewerInstance && cesiumInstance && newCamera) {
    const { position, heading, pitch, roll } = newCamera;
    
    // 如果是透明模式（AR模式），使用setView立即更新，保证实时同步
    if (props.isTransparent) {
      // 更新视场角 (FOV) - 仅在AR模式下为了对齐视频
      if (viewerInstance.camera.frustum instanceof cesiumInstance.PerspectiveFrustum) {
        viewerInstance.camera.frustum.fov = cesiumInstance.Math.toRadians(newFOV || 60);
      }

      viewerInstance.camera.setView({
        destination: cesiumInstance.Cartesian3.fromDegrees(
          position.lng,
          position.lat,
          position.height
        ),
        orientation: {
          heading: cesiumInstance.Math.toRadians(heading), 
          pitch: cesiumInstance.Math.toRadians(pitch),
          roll: cesiumInstance.Math.toRadians(roll || 0)
        }
      });
    } 
    // 如果是普通模式（地图模式），使用flyTo平滑过渡
    else {
      viewerInstance.camera.flyTo({
        destination: cesiumInstance.Cartesian3.fromDegrees(
          position.lng,
          position.lat,
          position.height
        ),
        orientation: {
          heading: cesiumInstance.Math.toRadians(heading), 
          pitch: cesiumInstance.Math.toRadians(pitch),
          roll: cesiumInstance.Math.toRadians(roll || 0)
        },
        duration: 0.5
      });
    }
  }
}, { deep: true });

// 生成随机API密钥
const getRandomApiKey = () => {
  return apiKeys[Math.floor(Math.random() * apiKeys.length)]
}

// 初始化Cesium视图
  const onViewerReady = ({ Cesium, viewer }) => {
    cesiumInstance = Cesium
    viewerInstance = viewer
    
    // 清除默认图层
    viewer.imageryLayers.removeAll()
    
    // 如果是透明模式（AR模式），不加载卫星底图，只加载注记
    if (!props.isTransparent) {
      // 添加天地图影像图层
      const imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/img_w/wmts?tk=${getRandomApiKey()}`,
        layer: 'img',
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        minimumLevel: 3,
        credit: '天地图'
      })
      viewer.imageryLayers.addImageryProvider(imageryProvider)
    } else {
      // AR模式下，可以开启地形深度检测，使得标注能根据地形遮挡或贴地
      viewer.scene.globe.depthTestAgainstTerrain = true;
    }
    
    // 添加天地图中文注记图层
    const annotationProvider = new Cesium.WebMapTileServiceImageryProvider({
      // AR模式(transparent)下也使用cia_w(卫星注记)，因为它在深色/视频背景下可读性更好(白色字体)
      url: `https://t0.tianditu.gov.cn/cia_w/wmts?tk=${getRandomApiKey()}`,
      layer: 'cia',
      style: 'default',
      // 必须使用png以支持透明背景，jpeg会导致黑色背景遮挡视频
      format: 'image/png',
      tileMatrixSetID: 'w',
      maximumLevel: 18,
      minimumLevel: 3,
      credit: '天地图注记'
    })
    viewer.imageryLayers.addImageryProvider(annotationProvider)
    

    // 配置相机控制器 - 仅允许缩放，实现鹰眼视图效果
    // 1. 禁用相机旋转：防止用户通过鼠标拖拽改变观察角度
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    // 2. 禁用相机平移：确保视图始终聚焦在无人机位置
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    // 3. 启用相机缩放：允许用户调整缩放级别查看细节或更大范围
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    // 4. 禁用相机倾斜：保持俯视视角，确保地图元素正确比例显示
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    // 5. 禁用相机跟随鼠标：固定相机视角，防止用户意外改变观察方向
    viewer.scene.screenSpaceCameraController.enableLook = false;
    
    // 设置相机视角
    updateCameraView()
  }


// 地图移动结束事件
const onMapMoveEnd = () => {
  if (!viewerInstance || !cesiumInstance) return
  
  const camera = viewerInstance.camera
  const cartographic = cesiumInstance.Cartographic.fromCartesian(camera.position)
  
  // 更新无人机位置信息
  droneInfo.value.longitude = cesiumInstance.Math.toDegrees(cartographic.longitude)
  droneInfo.value.latitude = cesiumInstance.Math.toDegrees(cartographic.latitude)
  droneInfo.value.height = cartographic.height
}

// 根据起点、距离、方位角和俯仰角计算终点坐标
const calculateEndPosition = (startLng, startLat, startHeight, distance, headingRad, pitchRad) => {
  const earthRadius = 6378137 // 地球半径（米）
  
  // 将起始点转换为弧度
  const startLngRad = startLng * Math.PI / 180
  const startLatRad = startLat * Math.PI / 180
  
  // 计算水平距离
  const horizontalDistance = distance * Math.cos(pitchRad)
  // 计算垂直距离
  const verticalDistance = distance * Math.sin(pitchRad)
  
  // 计算纬度和经度的变化
  const latChange = horizontalDistance / earthRadius
  const lngChange = horizontalDistance / (earthRadius * Math.cos(startLatRad))
  
  // 计算终点经纬度
  const endLatRad = startLatRad + latChange * Math.cos(headingRad)
  const endLngRad = startLngRad + lngChange * Math.sin(headingRad)
  
  // 计算终点高度
  const endHeight = startHeight + verticalDistance
  
  // 转换回度数
  return {
    lng: endLngRad * 180 / Math.PI,
    lat: endLatRad * 180 / Math.PI,
    height: endHeight
  }
}

// 组件挂载
onMounted(() => {
  console.log('LiveBarOnePC: MiniMapContainer mounted');
})

// 暴露给父组件的方法和属性
defineExpose({
  getViewer: () => viewerInstance,
  getCesium: () => cesiumInstance
})
</script>

<style scoped lang="scss">
.drone-camera-view-container {
  display: flex;
  height: 300px;
  overflow: hidden;
  background-color: #1a1a1a;
  border: 1px solid #333;
  flex-direction: column;
  
  // 透明模式（AR模式）
  &.is-transparent {
    background-color: transparent !important;
    border: none !important;
    
    .view-header, .control-panel {
      display: none !important;
    }
  }
  
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: #2d2d2d;
    border-bottom: 1px solid #444;
    
    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
    
    .camera-info {
      display: flex;
      gap: 16px;
      
      .info-item {
        padding: 4px 8px;
        font-size: 12px;
        color: #4ecdc4;
        background-color: rgb(78 205 196 / 10%);
        border-radius: 4px;
      }
    }
  }
  
  .cesium-viewer-wrapper {
    flex: 1;
    position: relative;
    
    :deep(.cesium-viewer) {
      width: 100%;
      height: 300px;
      
      .cesium-widget-credits {
        display: none !important;
      }
      
      .cesium-viewer-toolbar {
        display: none !important;
      }
      
      .cesium-viewer-bottom {
        display: none !important;
      }
    }
  }
  
  .control-panel {
    display: flex;
    padding: 12px 16px;
    background-color: #2d2d2d;
    border-top: 1px solid #444;
    gap: 20px;
    
    .control-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      label {
        font-size: 12px;
        font-weight: 500;
        color: #aaa;
      }
      
      :deep(.el-slider) {
        --el-slider-track-background-color: #4ecdc4;
        --el-slider-button-background-color: #4ecdc4;
      }
    }
  }
}
</style>