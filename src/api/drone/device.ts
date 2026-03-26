import { service } from '@/config/axios/service'

export enum DeviceCmd {
  DeviceReboot = 'reboot',
  DroneOpen = 'drone_open',
  DroneClose = 'drone_close',
  CoverOpen = 'cover_open',
  CoverClose = 'cover_close',
  PutterOpen = 'putter_open',
  PutterClose = 'putter_close',
  ChargeOpen = 'charge_open',
  ChargeClose = 'charge_close'
}

export interface SendCmdParams {
  dock_sn: string,
  device_cmd: DeviceCmd
}

export interface PostSendCmdBody {
  action?: any
}

export const DeviceApi = {
  // 獲取設備列表
  getDeviceList: () => {
    return service.get('/admin-api/dock/device/list')
  },
  
  // 發送機場控制指令
  postSendCmd: (params: SendCmdParams, data?: PostSendCmdBody) => {
    return service.post(`/iot/devices/${params.dock_sn}/jobs/${params.device_cmd}`, data)
  },
  
  // 切換機場直播攝像頭
  positionChange: (data: any) => {
    return service.post(`/iot/live/streams/positionChange`, data)
  },
  
  // 設備主動上線
  putDeviceActiveOnline: (deviceSn: string) => {
    return service.put(`/dock/device/online/${deviceSn}`)
  }
}
