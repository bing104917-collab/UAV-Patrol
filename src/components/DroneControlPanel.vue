<script setup lang="ts">
import { computed } from 'vue'
import { useDroneStore } from '@/store/drone'
import { DroneMode } from '@/types/drone'
import { DeviceCmd } from '@/api/drone/device'

const droneStore = useDroneStore()
const drone = computed(() => droneStore.currentDrone)

const handleTakeoff = () => {
  droneStore.takeoff(120)
}

const handleReturnHome = () => {
  droneStore.sendDeviceCmd(DeviceCmd.DroneOpen) // 模擬指令
}

const toggleRecording = () => {
  drone.value.camera.isRecording = !drone.value.camera.isRecording
}
</script>

<template>
  <div class="drone-control-panel bg-white/90 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-lg">
    <div class="section-title text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">飛行控制</div>
    <div class="grid grid-cols-2 gap-3 mb-6">
      <el-button 
        v-if="drone.mode === DroneMode.Standby" 
        type="success" 
        class="!rounded-lg h-10"
        @click="handleTakeoff"
      >
        <el-icon class="mr-1"><CaretRight /></el-icon>一鍵起飛
      </el-button>
      <el-button 
        v-else 
        type="warning" 
        class="!rounded-lg h-10"
        @click="droneStore.stopSimulation"
      >
        <el-icon class="mr-1"><VideoPause /></el-icon>中止任務
      </el-button>
      
      <el-button 
        type="danger" 
        plain 
        class="!rounded-lg h-10"
        @click="handleReturnHome"
      >
        <el-icon class="mr-1"><HomeFilled /></el-icon>一鍵返航
      </el-button>
    </div>

    <div class="section-title text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">負載控制</div>
    <div class="flex gap-2">
      <el-button type="primary" plain class="flex-1 !rounded-lg" @click="droneStore.sendDeviceCmd(DeviceCmd.DeviceReboot)">
        <el-icon class="mr-1"><Camera /></el-icon>抓拍
      </el-button>
      <el-button 
        :type="drone.camera.isRecording ? 'danger' : 'primary'" 
        plain 
        class="flex-1 !rounded-lg"
        @click="toggleRecording"
      >
        <el-icon class="mr-1" :class="{ 'animate-pulse': drone.camera.isRecording }">
          <VideoCameraFilled />
        </el-icon>
        {{ drone.camera.isRecording ? '停止錄像' : '開始錄像' }}
      </el-button>
    </div>
    
    <div class="mt-4 flex flex-col gap-2">
      <div class="flex-between text-xs text-gray-500">
        <span>直播質量</span>
        <el-radio-group v-model="drone.camera.quality" size="small">
          <el-radio-button label="0">自動</el-radio-button>
          <el-radio-button label="3">高清</el-radio-button>
          <el-radio-button label="4">超清</el-radio-button>
        </el-radio-group>
      </div>
      <div class="flex-between text-xs text-gray-500">
        <span>鏡頭切換</span>
        <el-radio-group v-model="drone.camera.liveType" size="small">
          <el-radio-button label="wide">廣角</el-radio-button>
          <el-radio-button label="zoom">變焦</el-radio-button>
          <el-radio-button label="ir">紅外</el-radio-button>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  border-left: 3px solid #409eff;
  padding-left: 8px;
}
</style>
