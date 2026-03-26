<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <el-container class="h-screen w-full bg-[#f0f2f5]">
    <el-aside width="240px" class="bg-[#001529] text-white overflow-hidden flex flex-col transition-all">
      <div class="h-16 flex items-center px-6 border-b border-[#002140] gap-3 overflow-hidden">
        <div class="w-8 h-8 bg-blue-500 rounded-md flex-center">
          <el-icon color="white" size="20"><Monitor /></el-icon>
        </div>
        <span class="font-bold text-lg truncate">校園巡護系統</span>
      </div>
      
      <el-menu
        :default-active="route.path"
        router
        class="flex-1 border-none"
        background-color="#001529"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>巡護工作台</span>
        </el-menu-item>
        <el-menu-item index="/wayline">
          <el-icon><MapLocation /></el-icon>
          <span>航線管理</span>
        </el-menu-item>
        <el-menu-item index="/violations">
          <el-icon><List /></el-icon>
          <span>違規紀錄管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系統設置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container class="flex-col">
      <el-header class="h-16 bg-white border-b flex-between px-6 z-10">
        <div class="flex items-center gap-2">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>首頁</el-breadcrumb-item>
            <el-breadcrumb-item>{{ route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="flex items-center gap-4">
          <el-dropdown>
            <div class="flex items-center gap-2 cursor-pointer outline-none">
              <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
              <span class="text-sm">管理員</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>個人中心</el-dropdown-item>
                <el-dropdown-item divided>退出登錄</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="p-4 overflow-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

:deep(.el-menu-item.is-active) {
  background-color: #1890ff !important;
}
</style>
