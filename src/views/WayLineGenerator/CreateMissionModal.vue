<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑' : '创建新航线'"
    :width="900"
    @close="$emit('cancel')"
    center
    class="create-mission-modal"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="modal-content px-4">
      
      <!-- 1. 巡逻巡检航线 -->
      <div class="form-block">
      <div class="mb-4 flex gap-5">
        <div class="w-[40%]"> 
        <h3 class="section-title mb-2">巡逻巡检航线</h3>
        <div class="flex flex-wrap gap-3">
          <div class="w-[calc(50%-9px)]">
            <div
              class="route-card"
              :class="{ 'route-card-active': form.templateType === 'waypoint' }"
              @click="form.templateType = 'waypoint'"
            >
              <div class="route-icon mb-2">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    d="M4 18L9 6L14 14L20 4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="4" cy="18" r="2" fill="currentColor" />
                  <circle cx="9" cy="6" r="2" fill="currentColor" />
                  <circle cx="14" cy="14" r="2" fill="currentColor" />
                  <circle cx="20" cy="4" r="2" fill="currentColor" />
                </svg>
              </div>
              <div class="route-name text-xs">航点航线</div>
            </div>
          </div>
          <div class="w-[calc(50%-9px)]">
            <div
              class="route-card"
              :class="{ 'route-card-active': form.templateType === 'patrol' }"
              @click="form.templateType = 'patrol'"
            >
              <div class="route-icon mb-2">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div class="route-name text-xs">巡逻航线</div>
            </div>
          </div>
        </div>
        </div>
        <div class="w-[60%]"></div>
      </div>

      <div class="flex gap-5">
        <!-- 2. 测绘航线 -->
        <div class="w-[40%]">
          <h3 class="section-title mb-2">测绘航线</h3>
          <div class="flex flex-wrap gap-3">
            <div class="w-[calc(50%-6px)]">
              <div
                class="route-card"
                :class="{ 'route-card-active': form.templateType === 'mapping2d' }"
                @click="form.templateType = 'mapping2d'"
              >
                <div class="route-icon mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M4 4h16v16H4z" stroke-dasharray="2 2" />
                    <path d="M6 8h8M14 8v4M14 12H6M6 12v4M6 16h8" />
                  </svg>
                </div>
                <div class="route-name text-xs">面状航线</div>
              </div>
            </div>
            <div class="w-[calc(50%-6px)]">
              <div class="route-card route-card-disabled">
                <div class="route-icon mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M4 12c0-4 2-8 6-8s6 4 6 8s2 8 6 8" />
                  </svg>
                </div>
                <div class="route-name text-xs">带状航线</div>
              </div>
            </div>
          </div>
        </div>
        <!-- 3. 精细化测绘航线 -->
        <div class="w-[60%]">
          <h3 class="section-title mb-2">精细化测绘航线</h3>
          <div class="flex flex-wrap gap-3">
            <div class="w-[calc(33.33%-8px)]">
              <div class="route-card route-card-disabled">
                <div class="route-icon mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M2 22L12 2L22 22H2Z" />
                  </svg>
                </div>
                <div class="route-name text-xs">斜面航线</div>
              </div>
            </div>
            <div class="w-[calc(33.33%-8px)]">
              <div class="route-card route-card-disabled">
                <div class="route-icon mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div class="route-name text-xs">几何体航线</div>
              </div>
            </div>
            <div class="w-[calc(33.33%-8px)]">
              <div class="route-card route-card-disabled">
                <div class="route-icon mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 2v4M16 2v4M8 18v4M16 18v4" />
                  </svg>
                </div>
                <div class="route-name text-xs">贴近摄影航线</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>


      <!-- 4. 选择飞行器 -->
       
      <div class="mb-4 form-block">
        <h3 class="section-title mb-2">选择飞行器</h3>
        <div class="flex flex-wrap gap-3">
          <div
            class="w-[calc(33.33%-8px)]"
            v-for="aircraft in aircraftSeriesList"
            :key="aircraft.id"
          >
            <div
              class="aircraft-card"
              :class="{ 'aircraft-card-active': form.aircraftSeries === aircraft.id }"
              @click="selectSeries(aircraft.id)"
            >
              {{ aircraft.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 5. 选择型号 -->
      <div class="mb-4 form-block">
        <h3 class="section-title mb-2">选择型号</h3>
        <div class="flex flex-wrap gap-3">
          <div
            class="w-[calc(33.33%-8px)]"
            v-for="model in currentModels"
            :key="model.id"
          >
            <div
              class="aircraft-card"
              :class="{ 'aircraft-card-active': form.aircraftModel === model.id }"
              @click="form.aircraftModel = model.id"
            >
              {{ model.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 6. 选择配件 -->
      <div class="mb-4 form-block" v-if="form.templateType === 'waypoint' && currentPayload.length > 0">
        <h3 class="section-title mb-2">选择型号</h3>
        <div class="flex flex-wrap gap-3">
          <div
            class="w-[calc(33.33%-8px)]"
            v-for="model in currentPayload"
            :key="model.id"
          >
            <div
              class="aircraft-card border-radius-26"
              :class="{ 'aircraft-card-active': form[model.id] === true }"    
              @click="form[model.id] = !form[model.id]"
            >
              {{ model.name }} 
            </div>
          </div>
        </div>
      </div>

      <!-- 7. 航线名称 -->
      <div class="mb-0 form-block">
        <h3 class="section-title mb-2">航线名称</h3>
        <el-input v-model="form.fileName" placeholder="请输入航线名称" />
      </div>

      <div class="mb-0 form-block">
        <h3 class="section-title mb-2">绑定无人机</h3>
        <el-select v-model="form.deviceSn" placeholder="请选择要绑定的无人机">
          <el-option
v-for="dict in deviceOptions" :key="dict.value"
            :label="dict.label" :value="dict.value" />
        </el-select>
      </div>


    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isEdit: {
    type: Boolean,
    default: true,
  },
  routeConfig: {
    type: Object,
    default: () => ({
      fileName: "",
      templateType: "waypoint",
      aircraftSeries: "",
      aircraftModel: "",
      droneEnumValue: 0,
      payloadEnumValue: 0,
      deviceSn: "",
      as1: false,
      al1: false,
      fovMax: 0,
      fovMin: 0,
      zoom: 0,
      isClosedLoop: false,
      routePointList: [],
    }),
  },
  deviceOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["cancel", "confirm"]);



// 飞行器数据定义
const aircraftData = {
  m30: {
    name: "经纬 M30 系列",
    models: [
      { id: "m30", name: "Matrice 30", enumValue: 67, payloadValue: 52 },
      { id: "m30t", name: "Matrice 30T", enumValue: 67, payloadValue: 53 },
    ],
  },
  m3e: {
    name: "Mavic 3 行业系列",
    models: [
      { id: "m3e", name: "Mavic 3E", enumValue: 77, payloadValue: 66 },
      { id: "m3t", name: "Mavic 3T", enumValue: 77, payloadValue: 67 },
      { id: "m3m", name: "Mavic 3M", enumValue: 77, payloadValue: 68 },
    ],
  },
  m3d: {
    name: "Matrice 3D 系列",
    models: [
      { id: "m3d", name: "Matrice 3D", enumValue: 90, payloadValue: 80 },
      { id: "m3td", name: "Matrice 3TD", enumValue: 90, payloadValue: 81 },
    ],
  },
  m4e: {
    name: "Matrice 4 行业系列",
    models: [
      { id: "m4e", name: "Matrice 4E", enumValue: 99, payloadValue: 88 },
      { id: "m4t", name: "Matrice 4T", enumValue: 99, payloadValue: 89 },
    ],
  },
  m4d: {
    name: "Matrice 4D 系列",
    models: [
      { id: "m4d", name: "Matrice 4D", enumValue: 100, payloadValue: 98 , fovMax: 57.4 , fovMin: 9.1, zoom: 112, },
      { id: "m4td", name: "Matrice 4TD", enumValue: 100, payloadValue: 99 , fovMax: 57.4 , fovMin: 9.1, zoom: 112, },
    ],
  },
  m400: {
    name: "Matrice 400",
    models: [{ id: "m400", name: "Matrice 400", enumValue: 103, payloadValue: 82 }],
  },
};



const payloadData = {
  m30: [],
  m3e: [],
  m3d: [],
  m4e: [
    { id: "as1", name: "喊话器", value: false },
    { id: "al1", name: "探照灯", value: false },
  ],
  m4d: [
    { id: "as1", name: "喊话器", value: false },
    { id: "al1", name: "探照灯", value: false },
  ],
  m400: [],
}
  



const aircraftSeriesList = Object.keys(aircraftData).map((key) => ({
  id: key,
  name: aircraftData[key].name,
}));

const form = reactive({
  templateType: "waypoint",
  aircraftSeries: "m4d",
  aircraftModel: "m4td",
  fileName: "新建巡逻航线",
  deviceSn: "",
  as1: false,
  al1: false,
});

// 监听航线类型变化，更新默认名称
watch(
  () => form.templateType,
  (newType) => {
    const names = {
      waypoint: "新建航点航线",
      patrol: "新建巡逻航线",
      mapping2d: "新建面状航线",
    };
    form.fileName = names[newType] || "新建航线";
  }
);






// 监听props变化，更新本地数据
watch(() => props.routeConfig, (newVal) => {
  console.log('newVal',newVal);
  // 复制新值
  form.templateType = newVal.templateType;
  form.aircraftSeries = newVal.aircraftSeries;
  form.aircraftModel = newVal.aircraftModel;
  form.fileName = newVal.fileName;
  form.deviceSn = newVal.deviceSn;
  form.as1 = newVal.as1;
  form.al1 = newVal.al1;

}, { immediate: true, deep: true });

const currentModels = computed(() => {
  return aircraftData[form.aircraftSeries]?.models || [];
});

const currentPayload = computed(() => {
  return payloadData[form.aircraftSeries] || [];
});

const selectSeries = (seriesId) => {
  form.aircraftSeries = seriesId;
  if (aircraftData[seriesId]?.models.length > 0) {
    form.aircraftModel = aircraftData[seriesId].models[0].id;
  }
};

const handleConfirm = () => {
  const series = aircraftData[form.aircraftSeries];
  const model = series.models.find((m) => m.id === form.aircraftModel);

  emit("confirm", {
    ...form,
    droneEnumValue: model?.enumValue,
    payloadEnumValue: model?.payloadValue,
    fovMax: model?.fovMax || 57.4,
    fovMin: model?.fovMin || 9.1,
    zoom: model?.zoom || 112,
  });

};
</script>

<style scoped lang="scss">
.modal-content {
  padding: 0;
  .form-block {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
}

.section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
}

.route-card {
  display: flex;
  min-height: 90px;
  padding: 16px 12px;
  cursor: pointer;
  background: #f3f4f6;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.3s;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.route-card:hover:not(.route-card-disabled) {
  background: #d7d8da;
  transform: translateY(-2px);
  
}

.route-card-active {
  background: #dbeafe !important;
  border-color: #3498db !important;
}

.route-card-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.route-icon {
  margin-bottom: 8px;
  color: #6b7280;
}

.route-card-active .route-icon {
  color: #3498db;
}

.route-name {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  text-align: center;
}

.aircraft-card {
  display: flex;
  min-height: 40px;
  padding: 16px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  cursor: pointer;
  background: #f3f4f6;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.3s;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.aircraft-card:hover {
  background: #d7d8da;
  transform: translateY(-2px);
}

.aircraft-card-active {
  font-weight: 500;
  color: #374151 !important;
  background: #dbeafe !important;
  border-color: #3498db !important;
}
.border-radius-26 {
  border-radius: 26px;
}
</style>
