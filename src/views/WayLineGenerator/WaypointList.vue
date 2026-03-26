<template>
  <div class="waypoint-list">
    <div class="waypoint-list-header">
      <h4>{{ title }}</h4>
       <el-tooltip 
          placement="top"
          effect="light"
          content="首尾航点翻转"
        >
          <Icon v-if="!isPatrolMode" class="cursor-pointer" :size="20" icon="svg-icon:reverse" @click="$emit('reverse-waypoints')"  />
        </el-tooltip>
    </div>
    <!-- 航线统计模块 -->
    <!-- 航线距离 航线时间 航点数量 素材数量 -->
    <div class="route-statistics"> 
      <!-- 测绘航线模式 -->
      <template v-if="isPatrolMode">
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="测绘面积"
          >
              <Icon class="cursor-pointer" icon="svg-icon:surveyArea" />
          </el-tooltip>
          <span>{{ routeStats.area || '0' }}㎡</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="航线距离"
          >
              <Icon class="cursor-pointer" icon="svg-icon:distance-fill" />
          </el-tooltip>
          <span>{{ routeStats.distance }}m</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="航线时间"
          >
              <Icon class="cursor-pointer" icon="svg-icon:wayLineTime" />
          </el-tooltip>
          <span>{{ formatTime(routeStats.time) }}</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="照片数量"
          >
              <Icon class="cursor-pointer" icon="svg-icon:photo" />
          </el-tooltip>
          <span>{{ routeStats.materialCount }}</span>
        </div>
      </template>
      <!-- 普通航线模式 -->
      <template v-else>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="航线距离"
          >
              <Icon class="cursor-pointer" icon="svg-icon:distance-fill" />
          </el-tooltip>
          <span>{{ routeStats.distance }}m</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="航线时间"
          >
              <Icon class="cursor-pointer" icon="svg-icon:wayLineTime" />
          </el-tooltip>
          <span>{{ formatTime(routeStats.time) }}</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="航点数量"
          >
              <Icon class="cursor-pointer" icon="svg-icon:wayPoint" />
          </el-tooltip>
          <span>{{ routeStats.waypointCount }}</span>
        </div>
        <div class="stat-item">
          <el-tooltip
            placement="top"
            effect="light"
            content="素材数量"
          >
              <Icon class="cursor-pointer" icon="svg-icon:photo" />
          </el-tooltip>
          <span>{{ routeStats.materialCount }}</span>
        </div>
      </template>
    </div>
   
    <div class="waypoint-list-content">
      <!-- 普通模式显示航点列表 -->
      <template v-if="!isPatrolMode">
        <div v-if="waypoints.length === 0" class="empty-waypoint">
          <el-icon><Plus /></el-icon>
          <span>暂无航点，请在地图上右键创建航点</span>
        </div>
        <div 
          v-for="(waypoint, index) in waypoints" 
          :key="waypoint.id" 
          class="waypoint-item"
          :class="{
            'selected-waypoint': selectedWaypoint?.id === waypoint.id
          }"
          @contextmenu="handlePointContextMenu($event, waypoint, index)"
          @click="$emit('waypoint-click', waypoint, index)"
        >
          <!-- 航点标题与动作在一行 -->
          <div class="waypoint-item-row">
            <!-- 仅保留数字，去掉航点文字 -->
            <div class="waypoint-item-index">{{ index + 1 }}</div>
            
            <!-- 航点动作图标 -->
          <div class="actions-row">
            <div 
              v-for="(action, actionIndex) in waypoint.actionGroupList[0].actions" 
              :key="actionIndex" 
              class="action-item"
              :class="{
                'selected-action': selectedWaypoint?.id === waypoint.id && 
                                    (selectedActionIndex === actionIndex || (selectedActionIndex === null && actionIndex === 0))
              }"
              @click.stop="$emit('action-click', waypoint, action, actionIndex)"
              @contextmenu.stop="handleActionContextMenu($event, waypoint, action, actionIndex)"
            >
            <el-tooltip placement="top" effect="light" :content="getActionName(action.type)">
              <Icon class="cursor-pointer" color="grey" :icon="`svg-icon:${getActionIcon(action.type)}`" />
            </el-tooltip>
            </div>
          </div>
          </div>
          
          <!-- 航点详情 - 仅在调试模式下显示 -->
          <div class="waypoint-detail" v-if="debugMode">
            <div class="detail-item">
              <span class="label">经度：</span>
              <span class="value">{{ waypoint.longitude.toFixed(6) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">纬度：</span>
              <span class="value">{{ waypoint.latitude.toFixed(6) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">高度 height：</span>
              <span class="value">{{ waypoint.height }}m</span>
            </div>
            <div class="detail-item">
              <span class="label">高度 ellipsoidHeight：</span>
              <span class="value">{{ waypoint.ellipsoidHeight }}m</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 巡逻模式/面状航线模式显示配置弹窗（嵌入式） -->
      <template v-else>
         <slot name="route-config-dialog"></slot>
      </template>
    </div>
    
    <!-- RouteConfigDialog插槽 (仅在非巡逻模式下放在这里，但为了避免重复渲染，我们在上面处理了) -->
    <!-- 注意：如果插槽内容是fixed定位，放在哪里都行。如果是relative定位，需要放在content里 -->
    <!-- 这里的逻辑是：如果是waypoint模式，RouteConfigDialog是fixed定位，放在content里也不会受影响（除了z-index上下文） -->
    <!-- 所以我们可以统一放在content里 -->

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible" 
      class="context-menu" 
      :style="contextMenuStyle"
      @click.stop
    >
      <el-menu>
        <el-menu-item v-if="contextMenuType === 'action'" @click="handleDeleteAction">
          删除动作
        </el-menu-item>
        <el-menu-item v-if="contextMenuType === 'point'" @click="handleDeletePoint">
          删除航点
        </el-menu-item>
      </el-menu>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { ActionType, getActionConfig } from "@/types/device";
// 定义props
const props = defineProps({
  waypoints: {
    type: Array,
    default: () => []
  },
  selectedWaypoint: {
    type: Object,
    default: null
  },
  selectedActionIndex: {
    type: Number,
    default: null
  },
  debugMode: {
    type: Boolean,
    default: false
  },
  routeStats: {
    type: Object,
    default: () => ({
      area: 0,
      distance: 0,
      time: 0,
      waypointCount: 0,
      materialCount: 0
    })
  },
  isPatrolMode: {
    type: Boolean,
    default: false
  },
  templateType: {
    type: String,
    default: 'waypoint'
  }
});

// 根据模板类型计算标题
const title = computed(() => {
  const typeMap = {
    waypoint: '航点列表',
    mapping: '面状航线',
    patrol: '巡逻航线'
  };
  return typeMap[props.templateType] || '航点列表';
});

// 定义emit事件
const emit = defineEmits([
  'reverse-waypoints',
  'waypoint-click',
  'action-click',
  'delete-point',
  'delete-action'
]);

// 右键菜单相关状态
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuType = ref(''); // 'action' 或 'point'
const contextMenuData = ref({}); // 存储右键菜单相关数据

// 右键菜单样式
const contextMenuStyle = computed(() => {
  return {
    left: `${contextMenuPosition.value.x}px`,
    top: `${contextMenuPosition.value.y}px`
  };
});

// 格式化时间（秒转换为m分s秒格式）
const formatTime = (seconds) => {
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m${remainingSeconds}s`;
};


// 获取动作图标
const getActionIcon = (type) => {
  const iconMap = {
    [ActionType.YAW]: 'aircraftHeading',
    [ActionType.PITCH]: 'gimbalPitchRotateAngle-fill',
    [ActionType.ZOOM]: 'zoom',
    [ActionType.PHOTO]: 'takePhotoType',
    [ActionType.ORIENTED_SHOOT]: 'orientedShoot',
    [ActionType.START_RECORD]: 'startRecord',
    [ActionType.STOP_RECORD]: 'stopRecord',
    [ActionType.PANO_SHOT]: 'panoShot',
    [ActionType.HOVER_TIME]: 'hoverTime',
    [ActionType.RECORD_POINT_CLOUD]: 'recordPointCloud'
  };
  return iconMap[type] || 'plus';
};

// 获取动作中文名称
const getActionName = (type) => {
  const nameMap = {
    [ActionType.YAW]: '飞行器偏航角',
    [ActionType.PITCH]: '云台俯仰角',
    [ActionType.ZOOM]: '相机变焦',
    [ActionType.PHOTO]: '拍照',
    [ActionType.ORIENTED_SHOOT]: '定向拍摄',
    [ActionType.START_RECORD]: '开始录像',
    [ActionType.STOP_RECORD]: '停止录像',
    [ActionType.PANO_SHOT]: '全景拍照',
    [ActionType.HOVER_TIME]: '悬停时间',
    [ActionType.RECORD_POINT_CLOUD]: '点云录制'
  };
  return nameMap[type] || '未知动作';
};


// 处理航点右键菜单
const handlePointContextMenu = (event, waypoint, index) => {
  event.preventDefault();
  
  // 检查当前航点是否未选中，如果未选中则自动选中该航点
  if (!props.selectedWaypoint || props.selectedWaypoint.id !== waypoint.id) {
    emit('waypoint-click', waypoint, index);
  }
  
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  };
  contextMenuType.value = 'point';
  contextMenuData.value = { waypoint, index };
  contextMenuVisible.value = true;
};

// 处理动作右键菜单
const handleActionContextMenu = (event, waypoint, action, index) => {
  event.preventDefault();
  
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  };
  contextMenuType.value = 'action';
  contextMenuData.value = { waypoint, action, index };
  contextMenuVisible.value = true;
};

// 处理删除动作
const handleDeleteAction = () => {
  const { waypoint, index } = contextMenuData.value;
  emit('delete-action', waypoint, index);
  contextMenuVisible.value = false;
};

// 处理删除航点
const handleDeletePoint = () => {
  emit('delete-point', contextMenuData.value);
  contextMenuVisible.value = false;
};

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false;
};

// 点击页面其他地方关闭右键菜单
const handleDocumentClick = () => {
  closeContextMenu();
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  
  // 首次渲染时，如果存在动作列表，默认选中第一个动作
  if (props.waypoints.length > 0) {
    const firstWaypoint = props.waypoints[0];
    if (firstWaypoint.actionGroupList && firstWaypoint.actionGroupList.length > 0 && firstWaypoint.actionGroupList[0].actions && firstWaypoint.actionGroupList[0].actions.length > 0) {
      const firstAction = firstWaypoint.actionGroupList[0].actions[0];
      // 触发航点点击事件，选中第一个航点
      emit('waypoint-click', firstWaypoint, 0);
      // 触发动作点击事件，选中第一个动作
      emit('action-click', firstWaypoint, firstAction, 0);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped lang="scss">
  // 左侧航点列表 - 固定宽度300px
.waypoint-list {
  display: flex;
  width: 320px;
  overflow: hidden;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
  flex-direction: column;
  flex-shrink: 0;
  
  .waypoint-list-header {
    display: flex;
    padding: 16px;
    border-bottom: 1px solid #e8e8e8;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  // 航线统计模块 - flex水平均分
  .route-statistics {
    display: flex;
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
    
    .stat-item {
      flex: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      
      span:first-child {
        font-size: 12px;
        color: #909399;
      }
      
      span:last-child {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
    }
  }
  
  .waypoint-list-content {
    min-height: 0;
    padding: 8px 16px;
    overflow-y: auto;
    flex: 1;
  }
  
  .empty-waypoint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #909399;
    
    .el-icon {
      margin-bottom: 16px;
      font-size: 48px;
    }
  }
  
  .waypoint-item {
    margin-bottom: 8px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    transition: all 0.3s;
    
    &:hover {
      box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
    }
    
    /* 航点标题与动作在一行 */
    .waypoint-item-row {
      display: flex;
      align-items: center;
      padding: 8px;
      background-color: #f5f7fa;
      
      .waypoint-item-index {
        display: flex;
        align-items: center;
        margin-right: 12px;
        font-size: 14px;
        font-weight: 600;
        color: #333;
        
        /* 绿色三角形箭头 - 使用SVG实现带圆角的三角形 */
        &::before {
          width: 12px;
          height: 10px;
          margin-right: 6px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10' width='12' height='10'%3E%3Cpath d='M0 0 L12 0 L6 10 Z' fill='%2319be6b' stroke='none' rx='0.5' ry='0.5'/%3E%3C/svg%3E");
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          content: '';

          /* 使用transform放大1.2倍 */
          transform: scale(1.2);
        }
      }
      
      /* 航点动作图标与标题在同一行 - 支持换行 */
      .actions-row {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin: 0;
      }
    }
    
    /* 调试模式下的航点详情 */
    .waypoint-detail {
      padding: 8px 16px;
      font-size: 12px;
      background-color: #fff;
      border-top: 1px solid #e8e8e8;
      
      .detail-item {
        margin-bottom: 4px;
      }
    }
    
    /* 航点选中状态 */
    &.selected-waypoint {
      background-color: #ecf5ff;
      border-color: #409eff;
      
      .waypoint-item-row {
        background-color: #ecf5ff;
      }
    }
    
    /* 简化actions-row样式，移除payload-actions嵌套 - 去掉间距 */
    .actions-row {
      display: flex;
      gap: 0;
      margin: 0;
      
      .action-item {
        display: flex;
        width: 32px;
        height: 32px;
        cursor: pointer;
        background-color: transparent;
        border-radius: 4px;
        transition: all 0.2s;
        align-items: center;
        justify-content: center;
        
        &:hover {
          background-color: #ecf5ff;
        }
        
        /* 选中状态 - 蓝色方形背景 */
        &.selected-action {
          background-color: #409eff;
          border-radius: 4px;
        }
        
        /* 选中时图标变白色 */
        &.selected-action .el-icon {
          color: #fff !important;
        }
        
        .icon-blue {
          color: #409eff;
        }
        
        .icon-green {
          color: #67c23a;
        }
        
        .icon-purple {
          color: #909399;
        }
        
        .icon-red {
          color: #f56c6c;
        }
        
        .icon-orange {
          color: #e6a23c;
        }
        
        .icon-gray {
          color: #909399;
        }
        
        .icon-yellow {
          color: #f1c40f;
        }
        
        .icon-default {
          color: #909399;
        }
      }
    }
  }

  // 右键菜单样式
  .context-menu {
    position: fixed;
    z-index: 9999;
    min-width: 120px;
    background-color: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);

    .el-menu {
      border: none;
      
      .el-menu-item {
        height: 36px;
        font-size: 14px;
        line-height: 36px;
        color: #606266;
        
        &:hover {
          color: #409eff;
          background-color: #ecf5ff;
        }
        
        .el-icon {
          margin-right: 8px;
        }
      }
    }
  }
}
</style>