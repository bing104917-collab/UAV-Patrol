export enum DroneMode {
  Disconnected = 0,
  Standby = 1,
  TakingOff = 2,
  InFlight = 3,
  Landing = 4,
  Charging = 5,
  Error = 6
}

export enum WaylineLostControlActionInCommandFlight {
  CONTINUE = 0,
  EXEC_LOST_ACTION = 1
}

export enum LostControlActionInCommandFLight {
  HOVER = 0, // 悬停
  Land = 1, // 着陆
  RETURN_HOME = 2, // 返航
}

export enum ERthMode {
  SMART = 0,
  SETTING = 1
}

export enum ECommanderModeLostAction {
  CONTINUE = 0,
  EXEC_LOST_ACTION = 1
}

export enum ECommanderFlightMode {
  SMART = 0,
  SETTING = 1
}

export interface PointBody {
  latitude: number;
  longitude: number;
  height: number;
}

export interface PostFlyToPointBody {
  max_speed: number,
  points: PointBody[]
}

export interface PostTakeoffToPointBody{
  target_height: number;
  target_latitude: number;
  target_longitude: number;
  security_takeoff_height: number;
  max_speed: number;
  rc_lost_action: LostControlActionInCommandFLight;
  rth_altitude: number;
  exit_wayline_when_rc_lost: WaylineLostControlActionInCommandFlight;
  rth_mode: ERthMode;
  commander_mode_lost_action: ECommanderModeLostAction;
  commander_flight_mode: ECommanderFlightMode;
  commander_flight_height: number;
}

export interface DroneState {
  sn: string
  model: string
  mode: DroneMode
  online: boolean
  battery: {
    capacityPercent: number
    returnHomePower: number
    landingPower: number
    remainFlightTime: number // 秒
  }
  height: number
  elevation: number
  horizontal_speed: number
  vertical_speed: number
  wind_speed: number
  longitude: number
  latitude: number
  heading: number
  pitch: number
  roll: number
  rtk_fixed: boolean
  gps_count: number
  camera: {
    isRecording: boolean
    quality: string
    liveType: 'wide' | 'zoom' | 'ir'
  }
}

export interface StreamConfig {
  url: string
  protocol: 'webrtc' | 'hls' | 'flv'
  active: boolean
}
