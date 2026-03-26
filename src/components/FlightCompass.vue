<script setup lang="ts">
import { computed } from 'vue'
import { useDroneStore } from '@/store/drone'

const droneStore = useDroneStore()
const drone = computed(() => droneStore.currentDrone)

const heading = computed(() => drone.value.heading)
</script>

<template>
  <div class="flight-compass">
    <div class="compass-ring">
      <div class="compass-marks">
        <span class="mark north">N</span>
        <span class="mark east">E</span>
        <span class="mark south">S</span>
        <span class="mark west">W</span>
      </div>
      <div class="compass-pointer" :style="{ transform: `rotate(${heading}deg)` }">
        <el-icon size="24" color="#409eff"><Top /></el-icon>
      </div>
    </div>
    <div class="heading-value font-mono">{{ heading.toFixed(1) }}°</div>
  </div>
</template>

<style lang="scss" scoped>
.flight-compass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.compass-ring {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.compass-marks {
  position: absolute;
  inset: 0;
  .mark {
    position: absolute;
    font-size: 10px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.6);
    transform: translate(-50%, -50%);
    
    &.north { top: 15%; left: 50%; color: #f56c6c; }
    &.east { top: 50%; left: 85%; }
    &.south { top: 85%; left: 50%; }
    &.west { top: 50%; left: 15%; }
  }
}

.compass-pointer {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -12px;
  margin-left: -12px;
  transition: transform 0.2s ease-out;
}

.heading-value {
  color: #409eff;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}
</style>
