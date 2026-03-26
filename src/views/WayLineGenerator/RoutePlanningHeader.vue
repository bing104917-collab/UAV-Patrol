<template>
  <div class="route-planning-header">
    <!-- 左侧按钮组 -->
    <div class="header-buttons">
      <!-- 返回按钮 -->
      <el-tooltip placement="top" effect="light" content="返回">
        <Icon
          class="cursor-pointer"
          color="#040000"
          :size="18"
          icon="svg-icon:back-line"
          @click="handleBackClick"
        />
      </el-tooltip>
      
      <!-- 分割线 -->
      <el-divider direction="vertical" />
      
      <!-- 保存按钮 -->
      <el-tooltip placement="top" effect="light" content="保存">
        <Icon
          class="cursor-pointer"
          color="#040000"
          :size="22"
          icon="svg-icon:save-line"
          @click="handleSaveClick"
        />
      </el-tooltip>
      <!-- 生成kmz航线 -->
       <!-- <el-tooltip placement="top" effect="light" content="生成kmz航线">
        <Icon
          class="cursor-pointer"
          color="green"
          size="22"
          icon="svg-icon:save-line"
          @click="emit('saveKmz')"
        />
      </el-tooltip> -->

      <!-- 航线设置 -->

      <el-button 
        v-if="!isPatrolMode"
        class="cursor-pointer route-config-btn" 
        :type="routeConfigActive ? 'primary' : 'info'" 
        @click="handleRouteConfigClick"
      >
        <Icon
          :size="20"
          :color="routeConfigActive ? '#fff' : '#fff'"
          icon="svg-icon:distance-fill"
        />

        航线配置
        <el-icon v-if="!routeConfigActive" class="el-icon--right"><arrow-down /></el-icon>
        <el-icon v-else class="el-icon--right"><arrow-up /></el-icon>
      </el-button>
    </div>

    <!-- 中间标题和设备信息 -->
    <div class="header-title" @click="handleEditMission">
      <!-- 航线标题 -->
      <h2>{{ routeConfig.fileName }}</h2>
      <div class="device-info">

        <span v-if="routeConfig.aircraftModel">
          <Icon 
            color="#fff"
            class="device-icon"
            :size="18"
            icon="svg-icon:drone"
          />
          {{ routeConfig.aircraftModel }}
        </span>

        <span v-if="routeConfig.as1">
          <Icon 
            :color="'#fff'"
            class="device-icon"
            :size="18"
            icon="svg-icon:megaphone"
          />
          喊话器
        </span>

        <span v-if="routeConfig.al1">
          <Icon 
            :color="'#fff'"
            class="device-icon"
            :size="18"
            icon="svg-icon:searchlight"
          />
          探照灯
        </span>
      </div>
    </div>

    <!-- 右侧设置按钮 -->
    <div class="header-settings">
      <!-- 设置按钮 -->
        <el-tooltip placement="top" effect="light" content="设置">
        <Icon
          class="cursor-pointer"
          :size="18"
          icon="svg-icon:setting"
          @click="handleSettingsClick"
        />
      </el-tooltip>
      <el-tooltip placement="top" effect="light" content="键盘">
        <Icon
          class="cursor-pointer"
          :size="18"
          icon="svg-icon:keybord"
          @click="handleKeyboardClick"
        />
      </el-tooltip>
      
    </div>
  </div>
</template>

<script setup>
  import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
// import { Keyboard } from "@element-plus/icons-vue";

// Props定义
const props = defineProps({
  // 航线配置按钮选中状态
  routeConfigActive: {
    type: Boolean,
    default: false,
  },
  routeConfig: {
    type: Object,
    default: () => ({
      fileName: "航线标题",
      aircraftModel: "Matrice 4D",
      as1: false,
      al1: false,
    }),
  },
  isPatrolMode: {
    type: Boolean,
    default: false,
  },
});

// 事件定义
const emit = defineEmits(["back", "save", "route-config", "settings", "keyboard", "edit-mission", "saveKmz"]);

// 按钮点击事件处理
const handleBackClick = () => {
  emit("back");
};

const handleSaveClick = () => {
  emit("save");
};

const handleRouteConfigClick = () => {
  emit("route-config");
};

const handleSettingsClick = () => {
  emit("settings");
};

const handleKeyboardClick = () => {
  emit("keyboard");
};

const handleEditMission = () => {
  emit("edit-mission");
};
</script>

<style scoped lang="scss">
.route-planning-header {
  display: flex;
  height: 54px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
}

.header-buttons {
  display: flex;
  gap: 20px;
  align-items: center;
}

.header-title {
  display: flex;
  padding: 8px 16px;
  cursor: pointer;
  background-color: grey;
  border-radius: 8px;
  flex-direction: row;
  align-items: center;
  gap: 16px;

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }

  .device-info {
    display: flex;
    font-size: 14px;
    font-weight: bolder;
    color: #FFF;
    gap: 12px;

    span {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
    }

    .device-icon {
      flex-shrink: 0;
    }
  }
}

.header-settings {
  display: flex;
  gap: 20px;
  align-items: center;
}
</style>
