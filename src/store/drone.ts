import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { DroneState, DroneMode, StreamConfig, PostTakeoffToPointBody, LostControlActionInCommandFLight, WaylineLostControlActionInCommandFlight, ERthMode, ECommanderModeLostAction, ECommanderFlightMode } from '@/types/drone'
import { DroneControlApi } from '@/api/drone/control'
import { DeviceApi, DeviceCmd } from '@/api/drone/device'
import { ElMessage } from 'element-plus'

// Force refresh after fixing import error
export const useDroneStore = defineStore('drone', () => {
  const currentDrone = reactive<DroneState>({
    sn: 'D-UAV-001',
    model: 'Matrice 350 RTK',
    mode: DroneMode.Standby,
    online: true,
    battery: {
      capacityPercent: 85,
      returnHomePower: 30,
      landingPower: 10,
      remainFlightTime: 1200
    },
    height: 0,
    elevation: 0,
    horizontal_speed: 0,
    vertical_speed: 0,
    wind_speed: 2.5,
    longitude: 116.397428,
    latitude: 39.90923,
    heading: 0,
    pitch: -90,
    roll: 0,
    rtk_fixed: true,
    gps_count: 24,
    camera: {
      isRecording: false,
      quality: '0',
      liveType: 'wide'
    }
  })

  const stream = reactive<StreamConfig>({
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    protocol: 'hls',
    active: true
  })

  const waylines = ref([
    { id: 1, name: '校園東側巡邏航線', droneModel: 'Matrice 350 RTK', type: '巡邏' },
    { id: 2, name: '圖書館周邊違停掃描', droneModel: 'Matrice 350 RTK', type: '建圖' },
    { id: 3, name: '宿舍區夜間巡護', droneModel: 'Matrice 350 RTK', type: '巡邏' }
  ])

  const currentWaylineId = ref<number | null>(null)

  const isSimulating = ref(false)
  let simTimer: any = null

  // --- API Methods ---

  // 獲取飛行控制權
  const getFlightAuth = async () => {
    try {
      await DroneControlApi.postFlightAuth(currentDrone.sn)
      ElMessage.success('獲取飛行控制權成功')
    } catch (e) {
      console.error(e)
    }
  }

  // 一鍵起飛
  const takeoff = async (height: number) => {
    try {
      const body: PostTakeoffToPointBody = {
        target_height: height,
        target_latitude: currentDrone.latitude,
        target_longitude: currentDrone.longitude,
        security_takeoff_height: 5,
        max_speed: 10,
        rc_lost_action: LostControlActionInCommandFLight.RETURN_HOME,
        rth_altitude: 50,
        exit_wayline_when_rc_lost: WaylineLostControlActionInCommandFlight.EXEC_LOST_ACTION,
        rth_mode: ERthMode.SMART,
        commander_mode_lost_action: ECommanderModeLostAction.EXEC_LOST_ACTION,
        commander_flight_mode: ECommanderFlightMode.SMART,
        commander_flight_height: height
      }
      await DroneControlApi.postTakeoffToPoint(currentDrone.sn, body)
      ElMessage.success('一鍵起飛指令已發送')
      startSimulation()
    } catch (e) {
      console.error(e)
    }
  }

  // 發送設備指令 (如重啟、開關艙蓋)
  const sendDeviceCmd = async (cmd: DeviceCmd, action?: any) => {
    try {
      await DeviceApi.postSendCmd({
        dock_sn: 'DOCK-SN-001',
        device_cmd: cmd
      }, { action })
      ElMessage.success(`指令 ${cmd} 已發送`)
    } catch (e) {
      console.error(e)
    }
  }

  // --- Simulation Methods ---

  const startSimulation = () => {
    if (isSimulating.value) return
    isSimulating.value = true
    currentDrone.mode = DroneMode.InFlight
    
    simTimer = setInterval(() => {
      // 模拟飞行路径（微调经緯度）
      currentDrone.longitude += (Math.random() - 0.5) * 0.0001
      currentDrone.latitude += (Math.random() - 0.5) * 0.0001
      
      // 模拟高度与速度波动
      currentDrone.height = 120 + (Math.random() - 0.5) * 5
      currentDrone.horizontal_speed = 5 + (Math.random() - 0.5) * 2
      currentDrone.battery.capacityPercent -= 0.01
      
      if (currentDrone.battery.capacityPercent < 20) {
        currentDrone.mode = DroneMode.Landing
      }
    }, 1000)
  }

  const stopSimulation = () => {
    isSimulating.value = false
    if (simTimer) {
      clearInterval(simTimer)
      simTimer = null
    }
    currentDrone.mode = DroneMode.Standby
    currentDrone.horizontal_speed = 0
    currentDrone.vertical_speed = 0
  }

  return {
    currentDrone,
    stream,
    waylines,
    currentWaylineId,
    isSimulating,
    startSimulation,
    stopSimulation,
    getFlightAuth,
    takeoff,
    sendDeviceCmd
  }
})
