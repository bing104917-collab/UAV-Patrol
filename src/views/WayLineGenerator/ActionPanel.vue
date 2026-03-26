<template>
  <div class="action-panel">
    <!-- 第一列：默认显示 -->
    <div class="action-column" style="width: 150px;">
      <div class="action-item" @click="handleAddAction(ActionType.ORIENTED_SHOOT)">
        <Icon class="action-icon" :size="22" icon="svg-icon:orientedShoot" />
        <span class="action-text">定向拍照</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.PANO_SHOT)">
        <Icon class="action-icon" :size="22" icon="svg-icon:panoShot" />
        <span class="action-text">全景拍照</span>
      </div>
      <div
class="action-item more-action" 
           :class="{ 'active': showMoreActions }" 
           @click="showMoreActions = !showMoreActions">
        <Icon class="action-icon" :size="22" icon="svg-icon:more" />
        <span class="action-text">更多</span>
      </div>
    </div>
    
    <!-- 第二列：更多动作（弹出显示） -->
    <div v-if="showMoreActions" class="action-column second-level">
      <div class="action-item" @click="handleAddAction(ActionType.START_RECORD)">
        <Icon class="action-icon" :size="22" icon="svg-icon:startRecord" />
        <span class="action-text">录像开始</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.STOP_RECORD)">
        <Icon class="action-icon" :size="22" icon="svg-icon:stopRecord" />
        <span class="action-text">录像结束</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.HOVER_TIME)">
        <Icon class="action-icon" :size="22" icon="svg-icon:hoverTime" />
        <span class="action-text">悬停</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.YAW)">
        <Icon class="action-icon" :size="22" icon="svg-icon:aircraftHeading" />
        <span class="action-text">飞行器偏航角</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.PITCH)">
        <Icon class="action-icon" :size="22" icon="svg-icon:gimbalPitchRotateAngle-fill" />
        <span class="action-text">云台俯仰角</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.PHOTO)">
        <Icon class="action-icon" :size="22" icon="svg-icon:takePhotoType" />
        <span class="action-text">拍照</span>
      </div>
      <div class="action-item" @click="handleAddAction(ActionType.ZOOM)">
        <Icon class="action-icon" :size="22" icon="svg-icon:zoom" />
        <span class="action-text">相机变焦</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { ActionType, getActionConfig } from "@/types/device";

// 定义组件属性
const props = defineProps({
  selectedWaypoint: {
    type: Object,
    default: null
  },
  selectedAction: {
    type: Object,
    default: null
  },
  selectedActionIndex: {
    type: Number,
    default: null
  }
});

// 定义组件事件
const emit = defineEmits(['update:selectedAction', 'update:selectedActionIndex', 'add-action']);

// 响应式变量
const showMoreActions = ref(false);

// 添加动作处理函数
const handleAddAction = (actionType) => {
  // 使用本地变量存储props值
  // eslint-disable-next-line vue/no-mutating-props
  const currentWaypoint = props.selectedWaypoint;
  
  // 检查是否有选中航点
  if (!currentWaypoint) {
    ElMessage.warning('请先选中一个航点');
    return;
  }
  
  // 获取动作配置
  const config = getActionConfig('default', actionType);
  
  // 计算当前动作索引（插入前的actions数组长度）
  const currentActionCount = (currentWaypoint.actionGroupList && currentWaypoint.actionGroupList.length > 0 && currentWaypoint.actionGroupList[0].actions) ? currentWaypoint.actionGroupList[0].actions.length : 0;
  const actionIndex = currentActionCount;
  
  // 创建新的动作对象
  let actionValue = config.defaultValue;
  
  // 根据actionType设置特定的默认值
  if (actionType === ActionType.PHOTO) {
    actionValue = 0;
  } else if (actionType === ActionType.PANO_SHOT) {
    actionValue = 1;
  } else if (actionType === ActionType.ORIENTED_SHOOT || actionType === ActionType.START_RECORD || actionType === ActionType.STOP_RECORD) {
    // 定向拍照、录像开始、结束动作 默认值为true
    actionValue = true;
  }
  
  // 创建基础动作对象
  const baseAction = {
    actionIndex: actionIndex, // 设置actionIndex为当前actions数组长度
    type: actionType,
    value: actionValue,
    label: config.label
  };
  
  // 根据actionType设置特定的属性
  let newAction;
  if (actionType === ActionType.PANO_SHOT) {
    newAction = {
      ...baseAction,
      takePhotoType: 1 // panoShot动作使用takePhotoType属性
    };
  } else {
    newAction = {
      ...baseAction,
      [actionType]: actionValue
    };
  }
  
  // 通过事件通知父组件添加动作
  emit('add-action', {
    action: newAction,
    actionType: actionType
  });
  
  ElMessage.success(`已添加${config.label}动作`);
};
</script>

<style scoped lang="scss">
// 动作面板
.action-panel {
  position: absolute;
  top: 50%;
  left: 20px;
  z-index: 1000;
  padding: 16px;
  transform: translateY(-50%);
}

// 动作列
.action-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 150px;
}

// 第二列：更多动作（弹出显示）
.action-column.second-level {
  position: absolute;
  top: 0;
  left: 166px; // 150px + 16px
}

// 动作项
.action-item {
  display: flex;
  margin-top: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  align-items: center;
  
  &:hover {
    
    .action-text {
      background: #3c3c3c;
    }
  }
  
  // 更多按钮选中状态
  &.active {
    background: rgb(60 60 60 / 20%);
    
    .action-icon {
      background: #1890ff;
    }
    
    
  }
  
  .action-icon {
    display: flex;
    width: 32px;
    height: 32px;
    font-size: 18px;
    color: white;
    background: #3c3c3c;
    border-radius: 2px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }
  
  .action-text {
    padding: 8px;
    font-size: 12px;
    font-weight: bolder;
    color: #fff;
    text-shadow: 0 0 10px rgb(0 0 0 / 60%), 
                 -1px -1px rgb(0 0 0 / 50%), 
                 1px -1px rgb(0 0 0 / 50%), 
                 -1px 1px rgb(0 0 0 / 50%), 
                 1px 1px rgb(0 0 0 / 50%);
    border-radius: 2px;
    transition: background 0.2s ease;
  }
}
</style>