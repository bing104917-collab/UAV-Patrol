<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import GMap from '@/components/GMap.vue'
import LiveVideoPlayer from '@/components/LiveVideoPlayer.vue'
import BatteryModule from '@/components/BatteryModule.vue'
import FlightCompass from '@/components/FlightCompass.vue'
import DroneControlPanel from '@/components/DroneControlPanel.vue'
import { PlateRecApi, ViolationApi, ViolationRecord } from '@/api/violation'
import { ElMessage } from 'element-plus'
import { useDroneStore } from '@/store/drone'
import { useMapStore } from '@/store/map'
import { DroneMode } from '@/types/drone'
import cesiumManager from '@/utils/CesiumManager'

const droneStore = useDroneStore()
const mapStore = useMapStore()
const { currentDrone: drone } = storeToRefs(droneStore)
const isRecognizing = ref(false)
const recognizedPlate = ref('')
const recentViolations = ref<ViolationRecord[]>([])
const activeTab = ref('waylines')

// 下發航線任務
const handleExecuteWayline = (wayline: any) => {
  if (droneStore.currentWaylineId === wayline.id) {
    ElMessage.info('該任務正在執行中')
    return
  }
  
  droneStore.currentWaylineId = wayline.id
  ElMessage.success(`任務「${wayline.name}」已下發至無人機`)
  
  // 如果還沒開始模擬，自動開始
  if (!droneStore.isSimulating) {
    droneStore.startSimulation()
  }
}

// 計算屬性與監聽

const droneModeLabel = computed(() => {
  const labels: Record<number, string> = {
    [DroneMode.Disconnected]: '未連接',
    [DroneMode.Standby]: '待機中',
    [DroneMode.TakingOff]: '起飛中',
    [DroneMode.InFlight]: '巡邏中',
    [DroneMode.Landing]: '著陸中',
    [DroneMode.Charging]: '充電中',
    [DroneMode.Error]: '異常'
  }
  return labels[drone.value.mode] || '未知'
})

onMounted(async () => {
  await getList()
  droneStore.startSimulation() // 啟動模擬數據
})

onUnmounted(() => {
  droneStore.stopSimulation()
})

const getList = async () => {
  try {
    const res = await ViolationApi.getViolations({})
    recentViolations.value = (res as any) || []
  } catch (e) {
    console.error(e)
  }
}

// 模拟无人机截图并识别车牌
const handleCaptureAndRecognize = async () => {
  isRecognizing.value = true
  try {
    // 这里模拟从视频流中截取图片
    setTimeout(async () => {
      const mockPlate = '粵B88888'
      recognizedPlate.value = mockPlate
      isRecognizing.value = false
      
      // 询问用户是否记录为违停
      ElMessage.success(`辨識成功：${mockPlate}`)
    }, 2000)
  } catch (e) {
    isRecognizing.value = false
    ElMessage.error('辨識失敗')
  }
}

const handleReportViolation = async () => {
  if (!recognizedPlate.value) return
  
  try {
    await ViolationApi.createViolation({
      plate_number: recognizedPlate.value,
      timestamp: new Date().toISOString(),
      location: '圖書館西側校園主路',
      image_url: 'https://example.com/violation.jpg'
    })
    ElMessage.success('違規紀錄已提交')
    await getList()
    recognizedPlate.value = ''
  } catch (e) {
    ElMessage.error('提交失敗')
  }
}
</script>

<template>
  <div class="h-full flex gap-4 overflow-hidden">
    <!-- 左侧主視角 (實時畫面) -->
    <div class="flex-1 rounded-xl overflow-hidden shadow-sm relative bg-black">
      <LiveVideoPlayer 
        :live-sn="drone.sn" 
        :debug="true"
        :is-mock="true"
        class="w-full h-full"
      />
      
      <!-- 頂部狀態條 (OSD Bar) - 疊加在實時畫面上 -->
      <div class="absolute top-4 left-4 right-4 flex-between z-20 pointer-events-none">
        <div class="flex gap-4 items-center pointer-events-auto">
          <div class="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 text-white flex items-center gap-4">
            <div class="flex flex-col">
              <span class="text-[10px] opacity-60 uppercase font-bold tracking-tighter">機型</span>
              <span class="text-sm font-bold">{{ drone.model }}</span>
            </div>
            <div class="w-[1px] h-8 bg-white/10"></div>
            <div class="flex flex-col">
              <span class="text-[10px] opacity-60 uppercase font-bold tracking-tighter">狀態</span>
              <el-tag :type="drone.online ? 'success' : 'danger'" size="small" effect="dark" class="!border-none !h-5 !px-1.5 !text-[10px]">
                {{ droneModeLabel }}
              </el-tag>
            </div>
          </div>
          
          <div class="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 text-white w-64">
            <div class="text-[10px] opacity-60 uppercase font-bold tracking-tighter mb-1">電量狀態</div>
            <BatteryModule />
          </div>
        </div>

        <div class="flex gap-2 pointer-events-auto">
          <div class="bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/20 text-white flex items-center gap-4 px-4 font-mono">
            <div class="text-center">
              <div class="text-[10px] opacity-60">高度 (H)</div>
              <div class="text-lg font-bold text-blue-400">{{ drone.height.toFixed(1) }}m</div>
            </div>
            <div class="text-center">
              <div class="text-[10px] opacity-60">距離 (D)</div>
              <div class="text-lg font-bold text-green-400">124.5m</div>
            </div>
            <div class="text-center">
              <div class="text-[10px] opacity-60">速度 (S)</div>
              <div class="text-lg font-bold text-yellow-400">{{ drone.horizontal_speed.toFixed(1) }}m/s</div>
            </div>
          </div>
          <FlightCompass />
        </div>
      </div>

      <!-- 畫面遮罩疊加 (AI識別模擬) -->
      <div class="absolute inset-0 pointer-events-none border-[40px] border-white/5"></div>
      <div class="absolute top-24 left-6 flex flex-col gap-2 pointer-events-none">
        <div class="bg-black/40 px-2 py-1 text-xs text-white font-mono rounded">ISO 100</div>
        <div class="bg-black/40 px-2 py-1 text-xs text-white font-mono rounded">EV 0.0</div>
      </div>
      
      <div class="absolute inset-0 flex-center bg-black/40 z-30" v-if="isRecognizing">
        <div class="text-center">
          <el-icon class="is-loading text-6xl text-blue-400 mb-4"><Loading /></el-icon>
          <div class="text-white text-lg font-bold tracking-widest">正在辨識目標車牌...</div>
        </div>
      </div>
      <!-- 掃描線動畫 -->
      <div v-if="isRecognizing" class="absolute top-0 left-0 w-full h-1.5 bg-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,1)] z-30 animate-[scan_3s_infinite]"></div>

      <!-- 識別結果快捷操作 -->
      <div v-if="recognizedPlate" class="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 w-96">
        <div class="bg-blue-600/90 backdrop-blur-xl border border-blue-400/50 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <div class="flex-between mb-4">
            <span class="text-white/80 font-bold text-sm flex items-center gap-2">
              <el-icon><Check /></el-icon>AI 辨識結果
            </span>
            <el-tag type="success" size="small" effect="dark">高置信度 98.5%</el-tag>
          </div>
          <div class="text-5xl font-black text-center tracking-[0.2em] text-white mb-6 font-mono drop-shadow-lg">
            {{ recognizedPlate }}
          </div>
          <div class="flex gap-3">
            <el-button type="info" plain class="flex-1 !bg-white/10 !border-white/20 !text-white hover:!bg-white/20" @click="recognizedPlate = ''">
              忽略
            </el-button>
            <el-button type="danger" class="flex-1 !bg-red-500 !border-none shadow-lg shadow-red-500/40" @click="handleReportViolation">
              上報違停
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧面板 -->
    <div class="w-96 flex flex-col gap-4 overflow-hidden">
      <!-- 小地圖窗口 -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100">
        <div class="h-12 flex-between px-4 border-b">
          <span class="font-bold flex items-center gap-2 text-gray-700">
            <el-icon color="#409eff"><MapLocation /></el-icon>
            任務小地圖
          </span>
          <div class="flex gap-1">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-[10px] text-gray-400 font-bold">GPS FIXED</span>
          </div>
        </div>
        <div class="aspect-video bg-black relative group">
          <GMap />
          <!-- 地圖控制按鈕 (疊加在小地圖上) -->
          <div class="absolute bottom-2 right-2 flex flex-col gap-1 z-20 pointer-events-auto scale-75 origin-bottom-right">
            <el-button-group class="!flex flex-col">
              <el-button circle class="!m-0 !mb-1 shadow-lg" size="small"><el-icon><Plus /></el-icon></el-button>
              <el-button circle class="!m-0 shadow-lg" size="small"><el-icon><Minus /></el-icon></el-button>
            </el-button-group>
            <el-button circle size="small" class="shadow-lg"><el-icon><Compass /></el-icon></el-button>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <DroneControlPanel />

      <!-- 導航與紀錄切換 -->
      <div class="flex-1 bg-white rounded-xl shadow-sm flex flex-col border border-gray-100 overflow-hidden">
        <div class="flex border-b">
          <button 
            class="flex-1 py-3 text-sm font-bold transition-colors"
            :class="activeTab === 'waylines' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'waylines'"
          >
            <el-icon class="mr-1"><Memo /></el-icon>巡邏航線
          </button>
          <button 
            class="flex-1 py-3 text-sm font-bold transition-colors"
            :class="activeTab === 'violations' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30' : 'text-gray-500 hover:bg-gray-50'"
            @click="activeTab = 'violations'"
          >
            <el-icon class="mr-1"><Warning /></el-icon>違規告警
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <!-- 航線列表 -->
          <div v-if="activeTab === 'waylines'" class="flex flex-col gap-3">
            <div 
              v-for="item in droneStore.waylines" 
              :key="item.id"
              class="group bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg p-3 transition-all cursor-pointer relative"
              @click="handleExecuteWayline(item)"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-700 group-hover:text-blue-700 text-sm">{{ item.name }}</span>
                <el-tag :type="item.type === '巡邏' ? 'primary' : 'warning'" size="small" class="!scale-75 origin-right">{{ item.type }}</el-tag>
              </div>
              <div class="text-[11px] text-gray-400 flex items-center gap-1">
                <el-icon><Cpu /></el-icon> {{ item.droneModel }}
              </div>
              <div v-if="droneStore.currentWaylineId === item.id" class="absolute right-3 bottom-3 text-blue-500 animate-pulse">
                <el-icon size="16"><VideoPlay /></el-icon>
              </div>
            </div>
          </div>

          <!-- 違規紀錄 -->
          <div v-else class="flex flex-col gap-3">
            <div 
              v-for="item in recentViolations" 
              :key="item.id"
              class="bg-red-50/50 border border-red-100 rounded-lg p-3"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="font-mono font-black text-red-700 text-lg">{{ item.plate_number }}</span>
                <span class="text-[10px] text-gray-400">{{ new Date(item.timestamp).toLocaleString() }}</span>
              </div>
              <div class="text-xs text-gray-500 flex items-center gap-1">
                <el-icon><Location /></el-icon> {{ item.location }}
              </div>
            </div>
            <div v-if="recentViolations.length === 0" class="py-10 text-center text-gray-400">
              <el-icon size="32" class="opacity-20 mb-2"><CircleCheck /></el-icon>
              <div class="text-xs">暫無違規紀錄</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flex-between {
  display: flex;
  justify-content: space-between;
  items-center: center;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@keyframes scan {
  from { top: 0; }
  to { top: 100%; }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
