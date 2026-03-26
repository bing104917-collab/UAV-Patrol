<template>
  <!-- 航线配置面板 -->
  <div
    v-if="visible"
    class="route-config-panel"
    :class="{ 'fixed-position': !isPatrolMode }"
  >
    <!-- 航线配置内容 -->
    <div class="route-config-content">
      <!-- 起飞点设置 -->
      <div class="config-card">
        <h4>起飞点设置</h4>
        <div class="config-item">
          <el-button type="primary" @click="handleSetTakeoffPoint">
            设置起飞点
          </el-button>
          <el-button
            type="default"
            @click="handleResetTakeoffPoint"
            :disabled="!localConfig.takeOffRefPoint"
          >
            重置起飞点
          </el-button>
        </div>
        <div class="config-item" v-if="localConfig.takeOffRefPoint">
          <div class="takeoff-point-info">
            起飞点已设置: {{ localConfig.takeOffRefPoint }}
          </div>
        </div>
      </div>

      <!-- 拍照设置 -->
      <div class="config-card" >
        <h4>拍照设置</h4>
        <div class="config-item">
          <el-checkbox-group 
            :model-value="localConfig.imageFormat" 
            @update:model-value="updateLocalConfig('imageFormat', $event)"
          >
            <el-checkbox-button  label="visable">可见光</el-checkbox-button>
            <el-checkbox-button :disabled="isPatrolMode" label="ir">红外照片</el-checkbox-button>
          </el-checkbox-group>
        </div>
      </div>

      <!-- 采集方式设置 todo -->
      <!-- <div class="config-card">
        <h4>采集方式</h4>
        <div class="config-item">
          <el-radio-group
            v-model="localConfig.collectionMethod"
            @change="updateLocalConfig('collectionMethod', $event)"
            class="collection-method-radio"
          >
            <el-radio-button label="ortho">正射采集</el-radio-button>
            <el-radio-button label="oblique">倾斜采集</el-radio-button>
          </el-radio-group>
        </div>
      </div> -->

      <!-- GSD设置 -->
      <div class="config-card" v-if="isPatrolMode">
        <h4>GSD</h4>
        <div class="config-item">
          <GSDInput
            :model-value="localConfig.gsd"
            @update:model-value="updateLocalConfig('gsd', $event)"
            :min="1"
            :max="50"
            :step="0.1"
          />
        </div>
      </div>

      <!-- 航点高度模式 -->
      <!-- todo 计算各个模式之前切换的逻辑 -->
      <div class="config-card">
        <h4>航点高度模式</h4>
        <div class="config-item">
          <el-radio-group
            :model-value="localConfig.heightMode"
            @update:model-value="updateLocalConfig('heightMode', $event)"
          >
            <el-radio-button label="EGM96">海拔高度</el-radio-button>
            <el-radio-button label="relativeToStartPoint">相对起飞点高度</el-radio-button>
            <el-radio-button label="aboveGroundLevel">相对地面高度</el-radio-button>
          </el-radio-group>
        </div>
        <div class="config-item height-input-item">
          <div class="image-placeholder">
            <!-- 根据高度模式显示对应的SVG图片 -->
            <img
              v-if="localConfig.heightMode === 'EGM96'"
              :src="AglInfo"
              alt="海拔高度"
              class="height-mode-image"
            />
            <img
              v-else-if="localConfig.heightMode === 'relativeToStartPoint'"
              :src="AltInfo"
              alt="相对起飞点高度"
              class="height-mode-image"
            />
            <img
              v-else-if="localConfig.heightMode === 'aboveGroundLevel'"
              :src="AslInfo"
              alt="相对地面高度"
              class="height-mode-image"
            />
          </div>
          <HeightInput
            :model-value="localConfig.globalHeight"
            @update:model-value="updateLocalConfig('globalHeight', $event)"
            :min="1"
            :max="1000"
            :step="0.1"
            unit="m"
          />
        </div>
      </div>

      <!-- 起飞动作 -->
      <el-popover placement="right" trigger="hover" width="300">
        <template #reference>
          <div class="config-card">
            <h4>起飞动作</h4>
            <div class="config-item">
              <el-radio-group
                :model-value="localConfig.flyToWaylineMode"
                @update:model-value="updateLocalConfig('flyToWaylineMode', $event)"
              >
                <el-radio-button label="safely">垂直爬升</el-radio-button>
                <el-radio-button label="pointToPoint">倾斜爬升</el-radio-button>
              </el-radio-group>
            </div>
            <div class="config-item height-input-item">
              <div class="image-placeholder">
                <img :src="TakeOff" alt="起飞动作" class="height-mode-image" />
              </div>
              <HeightInput
                :model-value="localConfig.takeOffSecurityHeight"
                @update:model-value="updateLocalConfig('takeOffSecurityHeight', $event)"
                :min="1"
                :max="500"
                :step="10"
                unit="m"
              />
            </div>
          </div>
        </template>
        <!-- Popover 内容 -->
        <div class="popover-content">
          <div class="popover-description">
            <p>垂直爬升：飞行器爬升到航线起始点高度后，再飞向航线起始点。</p>
            <p>倾斜爬升：飞行器爬升到"安全起飞高度"后，再直线飞到航线起始点。</p>
            <p>安全起飞高度：是相对起飞点的高度值。</p>
            <p>飞行器起飞后，会先上升至"安全起飞高度"，再飞向航线起始点。</p>
          </div>
          <div class="popover-image">
            <img :src="ReturnHeightInfo" alt="返回高度说明" />
          </div>
        </div>
      </el-popover>

      <!-- 航线速度设置 -->
      <div class="config-card">
        <h4>全局航线速度</h4>
        <div class="config-item">
          <el-input-number
            :model-value="localConfig.autoFlightSpeed"
            @update:model-value="updateLocalConfig('autoFlightSpeed', $event)"
            :min="1"
            :max="15"
            :step="0.5"
            placeholder="速度(m/s)"
            class="full-width"
          />
        </div>
      </div>

      <!-- 主航线角度设置 -->
      <div class="config-card" v-if="isPatrolMode">
        <div class="config-item flex-between">
          <h4>主航线角度</h4>
          <div class="angle-value">
            <EditableValue
              v-model="localConfig.mappingTypeReq.direction"
              type="number"
              :min="0"
              :max="359"
              :step="0.1"
              unit="°"
            />
          </div>
        </div>

        <div class="config-item">
          <div class="angle-controls">
            <el-button size="small" @click="handleAngleChange(-1)">-</el-button>
            <el-slider
              v-model="localConfig.mappingTypeReq.direction"
              @change="updateLocalConfig('mappingTypeReq.direction', $event)"
              :min="0"
              :max="359"
              :step="1"
              class="angle-slider"
            />
            <el-button size="small" @click="handleAngleChange(1)">+</el-button>
          </div>
          <!-- 角度指示器 -->
          <div class="angle-indicator fixed-indicator" v-if="showAngleIndicator">
            <div class="indicator-circle">
              <div
                class="indicator-line"
                :style="{ transform: `rotate(${localConfig.mappingTypeReq?.direction}deg)` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 高程优化设置 -->
      <div class="config-card" v-if="isPatrolMode">
        <div class="config-item flex-between">
          <span>高程优化</span>
          <el-popover placement="right" trigger="hover" width="250">
            <template #reference>
              <el-switch
                :active-value="1"
                :inactive-value="0"
                v-model="localConfig.mappingTypeReq.elevationOptimizeEnable"
                @change="updateLocalConfig('mappingTypeReq.elevationOptimizeEnable', $event)"
              />
            </template>
            <div class="popover-content">
              开启后，飞机会在航线飞行完毕后，飞向测区中心采集一组倾斜照片，最终模型将有更准确的高度信息
            </div>
          </el-popover>
        </div>
      </div>

      <!-- 高级设置 -->
      <div class="config-card">

        <h4>高级设置</h4>

        <div class="config-card" v-if="isPatrolMode">
          <h4>航向重叠率</h4>
          <div class="config-item">
            <GSDInput
              :model-value="localConfig.mappingTypeReq.orthoCameraOverlapH"
              @update:model-value="updateLocalConfig('mappingTypeReq.orthoCameraOverlapH', $event)"
              :min="10"
              :max="90"
              :step="1"
              unit="%"
            />
          </div>
        </div>
        <div class="config-card" v-if="isPatrolMode">
          <h4>旁向重叠率</h4>
          <div class="config-item">
            <GSDInput
              :model-value="localConfig.mappingTypeReq.orthoCameraOverlapW"
              @update:model-value="updateLocalConfig('mappingTypeReq.orthoCameraOverlapW', $event)"
              :min="10"
              :max="90"
              :step="1"
              unit="%"
            />
          </div>
        </div>
        <!-- 边距逻辑  -->
        <div class="config-card" v-if="isPatrolMode">
          <h4>边距</h4>
          <div class="config-item">
            <GSDInput
              :model-value="localConfig.mappingTypeReq.margin"
              @update:model-value="updateLocalConfig('mappingTypeReq.margin', $event)"
              :min="0"
              :max="100"
              :step="1"
              unit="m"
            />
          </div>
        </div>

      
        
        <div class="config-item">
          <span class="label">完成动作：</span>
          <el-select
            :model-value="localConfig.finishAction"
            @update:model-value="updateLocalConfig('finishAction', $event)"
            placeholder="选择完成动作"
          >
            <el-option label="退出航线模式并返航" value="goHome" />
            <el-option label="退出航线模式" value="noAction" />
            <el-option label="退出航线模式并降落" value="autoLand" />
          </el-select>
        </div>
        <div class="config-item">
          <span class="label">失控处理：</span>
          <el-select
            :model-value="localConfig.exitOnRCLost"
            @update:model-value="updateLocalConfig('exitOnRCLost', $event)"
            placeholder="失控处理方式"
          >
            <el-option label="继续执行航线" value="goContinue" />
            <el-option label="执行失控动作" value="executeLostAction" />
          </el-select>
        </div>
        <div class="config-item">
          <span class="label">失控动作：</span>
          <el-select
            :model-value="localConfig.exitOnRcLostAction"
            @update:model-value="updateLocalConfig('exitOnRcLostAction', $event)"
            placeholder="选择失控动作"
          >
            <el-option label="返航" value="goBack" />
            <el-option label="降落" value="landing" />
            <el-option label="悬停" value="hover" />
          </el-select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import HeightInput from "./components/HeightInput.vue";
import GSDInput from "./components/GSDInput.vue";
import EditableValue from "./components/EditableValue.vue";
// 引入SVG图标
import AglInfo from "@/assets/svgs/agl-info.svg";
import AltInfo from "@/assets/svgs/alt-info.svg";
import AslInfo from "@/assets/svgs/asl-info.svg";
import ReturnHeightInfo from "@/assets/svgs/return-height-info.svg";
import TakeOff from "@/assets/svgs/takeoff-info.svg";
// 导入GSD计算相关常量
import { CAMERA_PRESETS } from "@/utils/utils/polygonRouteGenerator";



// GSD转换相关的标志，防止无限循环
let isUpdatingFromGSD = false;
let isUpdatingFromHeight = false;

// 角度指示器显示状态和计时器
const showAngleIndicator = ref(false);
let angleIndicatorTimer = null;

// 显示角度指示器并重置计时器
const showIndicator = () => {
  showAngleIndicator.value = true;
  resetIndicatorTimer();
};

// 隐藏角度指示器
const hideIndicator = () => {
  showAngleIndicator.value = false;
};

// 重置计时器
const resetIndicatorTimer = () => {
  if (angleIndicatorTimer) {
    clearTimeout(angleIndicatorTimer);
  }
  angleIndicatorTimer = setTimeout(() => {
    hideIndicator();
  }, 3000);
};

// 清理计时器
const clearIndicatorTimer = () => {
  if (angleIndicatorTimer) {
    clearTimeout(angleIndicatorTimer);
    angleIndicatorTimer = null;
  }
};

// 组件卸载时清理计时器
onUnmounted(() => {
  clearIndicatorTimer();
});

// 计算GSD的函数：GSD (cm/pixel) = (高度 (m) * 传感器尺寸 (mm)) / (焦距 (mm) * 图像尺寸 (pixel)) * 100 (转换为cm)
const calculateGSD = (height) => {
  const camera = defaultCamera.value; // 获取computed属性的值
  if (!camera || typeof camera !== 'object') {
    console.warn('相机配置无效，使用默认值进行计算');
    return 10; // 默认GSD值
  }
  
  const sensor = camera.sensorWidth; // 使用传感器宽度
  const focalLength = camera.focalLength;
  const imageSize = camera.imageWidth;
  
  // 验证输入参数的有效性
  if (typeof height !== 'number' || !isFinite(height) || height <= 0) {
    console.warn('高度值无效，使用默认GSD值');
    return 10; // 默认GSD值
  }
  
  if (typeof sensor !== 'number' || !isFinite(sensor) || sensor <= 0 ||
      typeof focalLength !== 'number' || !isFinite(focalLength) || focalLength <= 0 ||
      typeof imageSize !== 'number' || !isFinite(imageSize) || imageSize <= 0) {
    console.warn('相机参数无效，使用默认GSD值');
    return 10; // 默认GSD值
  }
  
  const gsdM = (height * sensor) / (focalLength * imageSize); // GSD in meters
  const gsdCm = gsdM * 100; // Convert to cm
  return parseFloat(gsdCm.toFixed(1)); // 保留1位小数
};

// 计算高度的函数：高度 (m) = (GSD (cm/pixel) * 焦距 (mm) * 图像尺寸 (pixel)) / (传感器尺寸 (mm) * 100 (转换为m))
const calculateHeightFromGSD = (gsd) => {
  const camera = defaultCamera.value; // 获取computed属性的值
  if (!camera || typeof camera !== 'object') {
    console.warn('相机配置无效，使用默认高度值');
    return 50; // 默认高度值
  }
  
  const sensor = camera.sensorWidth; // 使用传感器宽度
  const focalLength = camera.focalLength;
  const imageSize = camera.imageWidth;
  
  // 验证输入参数的有效性
  if (typeof gsd !== 'number' || !isFinite(gsd) || gsd <= 0) {
    console.warn('GSD值无效，使用默认高度值');
    return 50; // 默认高度值
  }
  
  if (typeof sensor !== 'number' || !isFinite(sensor) || sensor <= 0 ||
      typeof focalLength !== 'number' || !isFinite(focalLength) || focalLength <= 0 ||
      typeof imageSize !== 'number' || !isFinite(imageSize) || imageSize <= 0) {
    console.warn('相机参数无效，使用默认高度值');
    return 50; // 默认高度值
  }
  
  const gsdM = gsd / 100; // Convert GSD from cm to meters
  const height = (gsdM * focalLength * imageSize) / sensor;
  return parseFloat(height.toFixed(1)); // 保留1位小数
};

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  configData: {
    type: Object,
    default: () => ({
      fileName: "", // 航线名称
      templateType: "waypoint", // 航线模板类型 waypoint 航点飞行；mapping2d 建图航拍；mapping3d 倾斜摄影；mappingStrip 航带飞行
      takeOffRefPoint: "", // 起飞点
      droneType: 100, // 无人机类型
      subDroneType: 1, // 无人机子机类型
      payloadType: 99, // 负载类型
      payloadPosition: 0, // 负载挂载位置
      aircraftModel: "m4td", // 无人机模型
      imageFormat: ["visable"], // 负载图片存储类型 visable：可见光；ir：红外
      flyToWaylineMode: "safely", // 飞航模式 safely：安全模式；pointToPoint  倾斜爬升
      takeOffSecurityHeight: 100, // 起飞安全高度
      finishAction: "goHome", // 航线结束动作 goHome：退出航线模式并返航； noAction：退出航线模式； autoLand：退出航线
      exitOnRCLost: "executeLostAction", // 失控是否继续执行航线 goContinue：继续执行航线 ，executeLostAction：执行失控动作
      exitOnRcLostAction: "goBack", // 失控动作类型 goBack 返航；landing 降落；hover：悬停
      globalHeight: 50, // 全局高度
      heightMode: "relativeToStartPoint", // 高度模式 relativeToStartPoint、aboveGroundLevel、EGM96
      autoFlightSpeed: 10, // 全局航线飞行速度
      gsd: 10, // GSD值（cm/pixel）
      mappingTypeReq: { // 建图航拍参数
        collectionMethod: "ortho", // 采集方式 ortho：正射采集。inclined：倾斜采集
        lensType: "camera", // lidar：激光。camera：可见光
        orthoCameraOverlapH: 80, // 可见光航向重叠率（正射）
        orthoCameraOverlapW: 70, // 可见光旁向重叠率（正射）
        inclinedCameraOverlapH: 80, // 可见光航向重叠率（倾斜）
        inclinedCameraOverlapW: 70, // 可见光旁向重叠率（倾斜）
        elevationOptimizeEnable: 0, // 是否开启高程优化 0：不开启；1：开启
        shootType: "time", // 拍照模式
        direction: 0,
        margin: 0,
      },
      scanSetting: {
        overlap: 20,
        angle: 0,
        margin: 0,
      },
    }),
  },
  isPatrolMode: {
    type: Boolean,
    default: false,
  },
});

// 定义emit事件
const emit = defineEmits([
  "update:visible",
  "update:configData",
  "setTakeoffPoint",
  "resetTakeoffPoint",
]);

// 获取相机配置的函数，根据aircraftModel获取对应的相机预设
const getCameraConfig = () => {
  try {
    // 检查props.configData是否存在且包含aircraftModel
    if (!props.configData || typeof props.configData !== 'object') {
      console.warn('configData不存在或不是对象，使用默认相机配置');
      return CAMERA_PRESETS["m4td"];
    }
    
    const { aircraftModel } = props.configData;
    
    // 检查aircraftModel是否存在且为有效字符串
    if (!aircraftModel || typeof aircraftModel !== 'string' || aircraftModel.trim() === '') {
      console.warn('aircraftModel不存在或为空，使用默认相机配置');
      return CAMERA_PRESETS["m4td"];
    }
    
    // 检查CAMERA_PRESETS中是否存在对应的配置
    const cameraConfig = CAMERA_PRESETS[aircraftModel.trim()];
    
    if (!cameraConfig || typeof cameraConfig !== 'object') {
      console.warn(`未找到aircraftModel为"${aircraftModel}"的相机配置，使用默认配置`);
      return CAMERA_PRESETS["m4td"];
    }
    
    // 验证相机配置的完整性
    const requiredFields = ['sensorWidth', 'focalLength', 'imageWidth'];
    const missingFields = requiredFields.filter(field => !(field in cameraConfig));
    
    if (missingFields.length > 0) {
      console.warn(`相机配置缺少必要字段: ${missingFields.join(', ')}，使用默认配置`);
      return CAMERA_PRESETS["m4td"];
    }
    
    // 验证数值类型的正确性
    const numericFields = ['sensorWidth', 'focalLength', 'imageWidth'];
    const invalidFields = numericFields.filter(field => {
      const value = cameraConfig[field];
      return typeof value !== 'number' || value <= 0 || !isFinite(value);
    });
    
    if (invalidFields.length > 0) {
      console.warn(`相机配置数值字段无效: ${invalidFields.join(', ')}，使用默认配置`);
      return CAMERA_PRESETS["m4td"];
    }
    
    console.log(`成功使用相机配置: ${cameraConfig.name || aircraftModel}`);
    return cameraConfig;
    
  } catch (error) {
    console.error('获取相机配置时发生错误:', error);
    console.warn('使用默认相机配置');
    return CAMERA_PRESETS["m4td"];
  }
};

// 相机参数（根据aircraftModel动态获取，失败时使用M4TD作为默认值）
const defaultCamera = computed(() => getCameraConfig());

// 本地数据副本
const localConfig = ref({});

// 保存上一次的高度模式，用于计算高度转换
const previousHeightMode = ref("");

// 将字符串转换为数组
const convertToArray = (value) => {
  if (typeof value === "string") {
    return value.split(",").filter((item) => item.trim());
  }
  return value || [];
};

// 将数组转换为字符串
const convertToString = (value) => {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return value || "";
};

// 解析起飞点字符串为对象
const parseTakeoffPoint = (pointStr) => {
  if (!pointStr) return null;
  const [lat, lng, height] = pointStr.split(",").map(Number);
  return { lat, lng, height };
};

// 计算高度模式切换时的新高度
const calculateHeightForModeChange = (currentHeight, currentMode, newMode, takeoffPoint) => {
  // 如果模式相同，不需要转换
  if (currentMode === newMode) return currentHeight;

  // 如果没有起飞点数据，无法进行精确转换，返回当前高度
  if (!takeoffPoint) {
    console.warn("起飞点数据缺失，无法进行精确高度模式转换");
    return currentHeight;
  }

  const takeoffEllipsoidHeight = takeoffPoint.height || 0;
  
  // 根据参考值计算转换关系：
  // 海拔高度 = 相对起飞点高度 + 起飞点椭球高度
  // 相对地形高度 = 海拔高度 - 地形高度
  
  // 从相对起飞点高度切换到海拔高度
  if (currentMode === "relativeToStartPoint" && newMode === "EGM96") {
    // 海拔高度 = 相对起飞点高度 + 起飞点椭球高度
    return parseFloat((currentHeight + takeoffEllipsoidHeight).toFixed(1));
  }

  // 从相对地面高度切换到海拔高度
  if (currentMode === "aboveGroundLevel" && newMode === "EGM96") {
    // 海拔高度 = 相对地面高度 + 地形高度
    // 根据参考值估算地形高度：144.67m
    const terrainHeight = 144.67;
    return parseFloat((currentHeight + terrainHeight).toFixed(1));
  }

  // 从海拔高度切换到相对起飞点高度
  if (currentMode === "EGM96" && newMode === "relativeToStartPoint") {
    // 相对起飞点高度 = 海拔高度 - 起飞点椭球高度
    return parseFloat((currentHeight - takeoffEllipsoidHeight).toFixed(1));
  }

  // 从海拔高度切换到相对地面高度
  if (currentMode === "EGM96" && newMode === "aboveGroundLevel") {
    // 相对地面高度 = 海拔高度 - 地形高度
    // 根据参考值估算地形高度：144.67m
    const terrainHeight = 144.67;
    return parseFloat((currentHeight - terrainHeight).toFixed(1));
  }

  // 从相对起飞点高度切换到相对地面高度
  if (currentMode === "relativeToStartPoint" && newMode === "aboveGroundLevel") {
    // 相对地面高度 = 相对起飞点高度 + (起飞点椭球高度 - 地形高度)
    // 根据参考值估算地形高度：144.67m
    const terrainHeight = 144.67;
    return parseFloat((currentHeight + takeoffEllipsoidHeight - terrainHeight).toFixed(1));
  }

  // 从相对地面高度切换到相对起飞点高度
  if (currentMode === "aboveGroundLevel" && newMode === "relativeToStartPoint") {
    // 相对起飞点高度 = 相对地面高度 - (起飞点椭球高度 - 地形高度)
    // 根据参考值估算地形高度：144.67m
    const terrainHeight = 144.67;
    return parseFloat((currentHeight - (takeoffEllipsoidHeight - terrainHeight)).toFixed(1));
  }

  return currentHeight;
};

// 监听props变化，更新本地数据
watch(
  () => props.configData,
  (newVal) => {
    // 复制新值
    const configCopy = { ...newVal };
    // 将imageFormat转换为数组
    configCopy.imageFormat = convertToArray(configCopy.imageFormat);
    localConfig.value = configCopy;
    
    // 初始化上一次的高度模式（仅在第一次加载时）
    if (!previousHeightMode.value && configCopy.heightMode) {
      previousHeightMode.value = configCopy.heightMode;
    }
  },
  { immediate: true, deep: true }
);

// 更新本地配置并立即emit
const updateLocalConfig = (key, value) => {
  // 处理imageFormat，确保至少保留一个选项
  if (key === "imageFormat") {
    // 如果尝试取消所有选项，保留第一个选项
    if (value.length === 0) {
      // 获取当前选中的选项，如果没有则默认选中第一个
      const currentSelected = localConfig.value.imageFormat || ["visable"];
      value = [currentSelected[0]];
    }
  }

  // 处理嵌套属性（如 mappingTypeReq.margin）
  let updatedConfig = { ...localConfig.value };
  
  if (key.includes('.')) {
    // 处理嵌套属性
    const keys = key.split('.');
    let current = updatedConfig;
    
    // 遍历到最后一个属性之前
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 设置最后一个属性的值
    current[keys[keys.length - 1]] = value;
  } else {
    // 处理普通属性
    updatedConfig[key] = value;
  }
  
  if (key === "heightMode") {
    // 获取起飞点信息
    const takeoffPoint = parseTakeoffPoint(localConfig.value.takeOffRefPoint);
    
    // 计算新高度（如果高度模式发生变化）
    if (previousHeightMode.value !== value) {
      // 如果previousHeightMode为空，说明是第一次设置，不需要转换
      if (previousHeightMode.value) {
        const newHeight = calculateHeightForModeChange(
          localConfig.value.globalHeight,
          previousHeightMode.value,
          value,
          takeoffPoint
        );
        updatedConfig.globalHeight = newHeight;
      }
    }
    
    // 更新上一次的高度模式
    previousHeightMode.value = value;
  }

  // GSD和高度之间的转换逻辑（仅在非高度模式切换时执行）
  if (key !== "heightMode") {
    if (key === "gsd" && !isUpdatingFromHeight) {
      // 从GSD更新高度，防止无限循环
      isUpdatingFromGSD = true;
      
      // GSD计算基于相对起飞点高度，需要根据当前高度模式进行转换
      const relativeToStartHeight = calculateHeightFromGSD(value);
      
      // 根据当前高度模式计算实际高度
      let newHeight = relativeToStartHeight;
      if (localConfig.value.heightMode === "EGM96") {
        // 如果是海拔高度模式，需要加上起飞点椭球高度
        const takeoffPoint = parseTakeoffPoint(localConfig.value.takeOffRefPoint);
        if (takeoffPoint) {
          newHeight = relativeToStartHeight + takeoffPoint.height;
        }
      } else if (localConfig.value.heightMode === "aboveGroundLevel") {
        // 如果是相对地面高度模式，需要减去地形高度
        const terrainHeight = 144.67; // 根据参考值估算地形高度
        newHeight = relativeToStartHeight - terrainHeight;
      }
      
      updatedConfig.globalHeight = parseFloat(newHeight.toFixed(1));
      isUpdatingFromGSD = false;
    } else if (key === "globalHeight" && !isUpdatingFromGSD) {
      // 从高度更新GSD，防止无限循环
      isUpdatingFromHeight = true;
      
      // GSD计算基于相对起飞点高度，需要根据当前高度模式进行转换
      let relativeToStartHeight = value;
      if (localConfig.value.heightMode === "EGM96") {
        // 如果是海拔高度模式，需要减去起飞点椭球高度
        const takeoffPoint = parseTakeoffPoint(localConfig.value.takeOffRefPoint);
        if (takeoffPoint) {
          relativeToStartHeight = value - takeoffPoint.height;
        }
      } else if (localConfig.value.heightMode === "aboveGroundLevel") {
        // 如果是相对地面高度模式，需要加上地形高度
        const terrainHeight = 144.67; // 根据参考值估算地形高度
        relativeToStartHeight = value + terrainHeight;
      }
      
      const newGSD = calculateGSD(relativeToStartHeight);
      updatedConfig.gsd = newGSD;
      isUpdatingFromHeight = false;
    }
  }

  // 更新本地配置
  localConfig.value = updatedConfig;

  // 准备发送给父组件的数据
  const emitData = { ...updatedConfig };

  // 如果更新的是imageFormat，将其转换为字符串
  if (key === "imageFormat") {
    emitData.imageFormat = convertToString(value);
  } else if (emitData.imageFormat) {
    // 如果不是更新imageFormat，但存在imageFormat属性，确保它是字符串
    emitData.imageFormat = convertToString(emitData.imageFormat);
  }

  // 立即emit更新到父组件
  emit("update:configData", emitData);
};

// 处理设置起飞点
const handleSetTakeoffPoint = () => {
  emit("setTakeoffPoint");
};

// 处理重置起飞点
const handleResetTakeoffPoint = () => {
  emit("resetTakeoffPoint");
};

// 处理角度增减
const handleAngleChange = (amount) => {
  let newAngle = localConfig.value.mappingTypeReq?.direction + amount;
  // 确保角度在0-359范围内
  if (newAngle < 0) {
    newAngle = 359;
  } else if (newAngle > 359) {
    newAngle = 0;
  }
  updateLocalConfig("mappingTypeReq.direction", newAngle);
  showIndicator();
};

// 监听mappingTypeReq.direction变化，显示指示器
watch(
  () => localConfig.value.mappingTypeReq?.direction,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      showIndicator();
    }
  }
);
</script>

<style scoped lang="scss">
.route-config-panel {
  width: 415px;
  overflow: auto;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

  /* 当templateType为waypoint时应用特殊样式 */
  &.fixed-position {
    position: fixed;
    top: 55px;
    left: 100px;
    z-index: 2000;
    height: calc(100vh - 55px);
  }

  /* 当templateType不是waypoint时应用默认样式 */
  &:not(.fixed-position) {
    position: relative;
    height: auto;
    width: 100%;
    box-shadow: none;
  }
}

.route-config-content {
  padding: 16px;
  overflow-y: auto;

  /* 当父容器有固定高度时，内容高度100% */
  .fixed-position & {
    height: 100%;
  }

  /* 当父容器高度auto时，内容高度auto */
  :not(.fixed-position) & {
    height: auto;
  }

  .config-card {
    padding: 16px;
    margin-bottom: 16px;
    background: #f8f9fa;
    border-radius: 8px;

    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .config-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      &.height-input-item {
        display: flex;
        align-items: center;
        gap: 12px;

        .image-placeholder {
          display: flex;
          width: 80%;
          height: 130px;
          background: #666;
          border-radius: 6px;
          align-items: center;
          justify-content: center;

          .placeholder-icon {
            font-size: 24px;
            color: #6c757d;
          }

          .height-mode-image {
            width: 238px;
            height: 126px;
          }
        }

        .height-input-container {
          width: 20%;
        }
      }

      .label {
        width: 80px;
        margin-right: 12px;
        font-size: 12px;
        color: #666;
        flex-shrink: 0;
      }

      &:last-child {
        margin-bottom: 0;
      }

      .takeoff-point-info {
        width: 100%;
        padding: 8px 12px;
        margin-top: 8px;
        font-size: 12px;
        color: #6c757d;
        text-align: center;
        background: #e9ecef;
        border-radius: 4px;
      }

      .el-checkbox-group,
      .el-radio-group {
        display: flex;

        .el-checkbox-button,
        .el-radio-button {
          :deep(.el-checkbox-button__inner),
          :deep(.el-radio-button__inner) {
            width: 100%;
            text-align: center;
          }
        }
      }

      .full-width {
        width: 100%;

        :deep(.el-input-number) {
          width: 100%;
        }
      }

      .el-select {
        flex: 1;
      }

      /* 主航线角度样式 */
      .angle-value {
        margin-bottom: 12px;
        font-size: 18px;
        font-weight: bold;
        color: var(--el-color-primary);
        text-align: center;
      }

      .angle-controls {
        display: flex;
        width: 100%;
        margin-bottom: 16px;
        align-items: center;
        gap: 10px;

        .el-button {
          display: flex;
          width: 40px;
          height: 32px;
          padding: 0;
          font-size: 16px;
          align-items: center;
          justify-content: center;
        }

        .angle-slider {
          flex: 1;
        }
      }

      /* 角度指示器样式 */
      .angle-indicator {
        display: flex;
        justify-content: center;
        margin-top: 16px;

        .indicator-circle {
          position: relative;
          display: flex;
          width: 100px;
          height: 100px;
          background: rgb(0 0 0 / 30%);
          border-radius: 50%;
          align-items: center;
          justify-content: center;

          .indicator-line {
            position: absolute;
            width: 5px;
            height: 90%;
            background: white;
            transform-origin: center 50%;
          }
        }
      }

      /* 固定定位的角度指示器 */
      .fixed-indicator {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 3000;
        margin-top: 0;
        transform: translate(-50%, -50%);
      }

      /* 高程优化样式 */
      .el-switch {
        margin-left: auto;
      }
    }
  }
}

/* flex布局辅助类 */
.config-item.flex-between {
  justify-content: space-between;
  align-items: center;

  span {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
}

/* Popover内容样式 */
.popover-content {
  padding: 8px;

  /* 直接在popover-content内的文本样式 */
  font-size: 12px;
  line-height: 1.5;
  color: #333;

  .popover-description {
    margin-bottom: 12px;

    p {
      margin: 8px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
    }
  }

  .popover-image {
    display: flex;
    padding: 8px;
    background: #666;
    border-radius: 6px;
    align-items: center;
    justify-content: center;

    img {
      height: auto;
      max-width: 100%;
    }
  }
}
</style>
