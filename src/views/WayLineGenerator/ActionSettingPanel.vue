<template>
  <div class="action-setting-panel">
    <!-- {{ selectedAction }} -->
    <div class="panel-header">
      <h3>{{ selectedAction ? getActionName(selectedAction.type) : "动作设置" }}</h3>

      <div class="delete-button-container" v-if="selectedAction?.type">
        <el-button
          v-if="!realDeleteButton"
          type="text"
          size="small"
          @click="handleRealDeleteButtonClick"
          class="delete-button"
        >
          <el-icon><Delete /></el-icon>
        </el-button>

        <div v-else class="confirm-delete">
          <el-popover
            placement="left"
            :visible="true"
            :show-arrow="false"
            width="180"
            trigger="manual"
            content="再次点击删除该航点动作"
          >
            <template #reference>
              <el-button
                type="text"
                size="small"
                @click="$emit('delete-action')"
                class="confirm-delete-button"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-popover>
        </div>
      </div>
    </div>

    <div class="panel-content" v-if="selectedAction && selectedAction?.type">
      <el-form label-position="top">
        <el-form-item v-if="showActionValueInput" label="动作值">
          <el-input-number
            v-model="localActionValue"
            :min="getActionMinValue(selectedAction.type)"
            :max="getActionMaxValue(selectedAction.type)"
            :step="getActionStep(selectedAction.type)"
            placeholder="值"
          />
          <el-slider
            v-model="localActionValue"
            :min="getActionMinValue(selectedAction.type)"
            :max="getActionMaxValue(selectedAction.type)"
            :step="getActionStep(selectedAction.type)"
            style="margin-top: 10px"
          />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from "vue";
import { Delete } from "@element-plus/icons-vue";
import { ActionType, getActionConfig } from "@/types/device";

// 定义props
const props = defineProps({
  selectedAction: {
    type: Object,
    default: null,
  },
});

// 定义emit事件
const emit = defineEmits(["delete-action", "update:action-value"]);

// 本地状态管理当前动作值
const localActionValue = ref(0);
const realDeleteButton = ref(false);
const countdown = ref(3);
let countdownTimer = null;

// 监听selectedAction的变化，更新本地状态
watch(
  () => props.selectedAction,
  (newAction) => {
    if (newAction) {
      const { type } = newAction;
      localActionValue.value =
        newAction[type] !== undefined ? newAction[type] : newAction.value || 0;
    } else {
      localActionValue.value = 0;
    }
  },
  { immediate: true, deep: true }
);

// 监听本地状态变化，通知父组件
watch(localActionValue, (newValue) => {
  emit("update:action-value", newValue);
});

// 计算属性：是否显示动作值输入框
const showActionValueInput = computed(() => {
  if (!props.selectedAction) return false;
  const noValueActions = [
    ActionType.PHOTO,
    ActionType.ORIENTED_SHOOT,
    ActionType.START_RECORD,
    ActionType.STOP_RECORD,
    ActionType.PANO_SHOT,
    ActionType.RECORD_POINT_CLOUD,
  ];
  return !noValueActions.includes(props.selectedAction.type);
});

// 获取动作名称
const getActionName = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig("default", type);
  return config?.label || "未知动作";
};

// 获取动作最小值
const getActionMinValue = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig("default", type);
  return config?.min || 0;
};

// 获取动作最大值
const getActionMaxValue = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig("default", type);
  return config?.max || 100;
};

// 获取动作步长
const getActionStep = (type) => {
  // 这里需要获取设备类型，暂时使用默认配置
  const config = getActionConfig("default", type);
  return config?.step || 1;
};

// 处理删除按钮点击
const handleRealDeleteButtonClick = () => {
  realDeleteButton.value = true;
  countdown.value = 3;

  // 清除之前的计时器
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  // 开始倒计时
  countdownTimer = setInterval(() => {
    countdown.value--;

    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      realDeleteButton.value = false;
    }
  }, 1000);
};

// 监听selectedAction变化，重置删除状态
watch(
  () => props.selectedAction,
  () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }
    realDeleteButton.value = false;
    countdown.value = 3;
  }
);
</script>

<style scoped lang="scss">
.action-setting-panel {
  min-height: 0;
  overflow-y: auto;
  flex: 1;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .delete-button-container {
      display: flex;
      align-items: center;

      .delete-button {
        color: #f56c6c;

        &:hover {
          color: #f78989;
          background-color: #fef0f0;
        }
      }

      .confirm-delete {
        :deep(.el-popover) {
          padding: 8px 12px;
          font-size: 12px;
          color: white;
          background-color: #f56c6c;
          border: none;

          .el-popover__title {
            color: white;
          }
        }

        .confirm-delete-button {
          color: #fff;
          background-color: #f56c6c;
          border-radius: 4px;

          &:hover {
            background-color: #f78989;
          }
        }

        .countdown-timer {
          min-width: 20px;
          font-size: 12px;
          font-weight: bold;
          color: #f56c6c;
          text-align: center;
        }
      }
    }
  }

  .panel-content {
    width: 95%;
    padding: 16px;
    box-sizing: border-box;
  }
}
</style>
