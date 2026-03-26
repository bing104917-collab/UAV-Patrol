<script setup lang="ts">
import { computed } from 'vue'
import { useDroneStore } from '@/store/drone'

const props = defineProps({
  width: {
    type: String,
    default: '100%'
  },
  scale: {
    type: Number,
    default: 1
  }
})

const droneStore = useDroneStore()
const battery = computed(() => droneStore.currentDrone.battery)

const remainingTimeStr = computed(() => {
  const totalSeconds = battery.value.remainFlightTime
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="battery-module" :style="{ width: width }">
    <div class="battery-bar-container">
      <!-- 剩餘容量 -->
      <div 
        class="capacity-percent battery-segment" 
        :style="{ width: battery.capacityPercent + '%' }"
      ></div>
      
      <!-- 返航電量 -->
      <div 
        class="return-home battery-segment" 
        :style="{ width: battery.returnHomePower + '%' }"
      ></div>
      
      <!-- 降落電量 -->
      <div 
        class="landing battery-segment" 
        :style="{ width: battery.landingPower + '%' }"
      ></div>
    </div>
    
    <el-tooltip
      effect="dark"
      :content="`返航電量: ${battery.returnHomePower}%`"
      placement="top"
    >
      <div 
        class="return-home-icon" 
        :style="{
          width: 16 * scale + 'px',
          height: 16 * scale + 'px',
          fontSize: 10 * scale + 'px',
          left: battery.returnHomePower + '%',
        }"
      >H</div>
    </el-tooltip>

    <div class="ml-2 text-xs font-mono text-white/80">
      {{ battery.capacityPercent.toFixed(0) }}% ({{ remainingTimeStr }})
    </div>
  </div>
</template>

<style lang="scss" scoped>
.battery-module {
  position: relative;
  display: flex;
  height: 20px;
  align-items: center;
  box-sizing: border-box;
}

.battery-bar-container {
  position: relative;
  height: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  flex: 1;
}

.battery-segment {
  position: absolute;
  height: 100%;
  transition: width 0.3s ease;
}

.capacity-percent {
  left: 0;
  z-index: 1;
  background: #03ee8c;
}

.return-home {
  left: 0;
  z-index: 2;
  background: #ff9f0a;
}

.landing {
  left: 0;
  z-index: 3;
  background: #f5222d;
}

.return-home-icon {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: flex;
  font-weight: bold;
  color: #000;
  background: #ffcc02;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
}
</style>
