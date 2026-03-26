<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import cesiumManager from '@/utils/CesiumManager'
import { useMapStore } from '@/store/map'
import { useDroneStore } from '@/store/drone'

const mapContainer = ref<HTMLElement | null>(null)
const mapStore = useMapStore()
const droneStore = useDroneStore()

// 在 GMap 內部監聽無人機位置
watch(
  () => [droneStore.currentDrone.longitude, droneStore.currentDrone.latitude, droneStore.currentDrone.height, droneStore.currentDrone.heading],
  ([lng, lat, alt, head]) => {
    if (!cesiumManager.viewer) return

    cesiumManager.updateDroneMarker(
      { longitude: lng as number, latitude: lat as number, height: alt as number },
      head as number
    )
    
    // 僅在第一次獲獲取到位置時定位，之後絕不自動定位
    if (!mapStore.hasInitiallyLocated && lng && lat) {
      console.log('GMap: 執行初次定位')
      mapStore.setInitiallyLocated(true) // 先設置標記，防止重複觸發
      cesiumManager.flyTo({
        longitude: lng as number,
        latitude: lat as number,
        height: 1000
      }, {
        heading: 0,
        pitch: -90
      }, {
        duration: 0
      })
    }
  }
)

onMounted(async () => {
  if (mapContainer.value) {
    const viewer = await cesiumManager.init(mapContainer.value)
    if (viewer) {
      mapStore.setViewer(viewer)
      // 初始化時不再主動定位，交由 Dashboard 的監聽器處理
    }
  }
})

onUnmounted(() => {
  cesiumManager.destroy()
  mapStore.clearViewer()
})
</script>

<template>
  <div ref="mapContainer" class="cesium-container w-full h-full relative overflow-hidden bg-black">
    <div class="absolute top-4 left-4 z-10 pointer-events-none">
      <slot name="overlay"></slot>
    </div>
  </div>
</template>

<style scoped>
.cesium-container {
  /* 強化佈局穩定性，防止 Cesium 調整大小觸發父級重排 */
  contain: layout size;
  display: block;
}

:deep(.cesium-viewer) {
  width: 100%;
  height: 100%;
}
</style>
