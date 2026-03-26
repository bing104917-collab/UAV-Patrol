// 动作配置类型定义
export interface ActionConfig {
  min: number;
  max: number;
  defaultValue: number;
  step: number;
  label: string;
}

// 动作类型枚举
export enum ActionType {
  YAW = 'aircraftHeading', // 偏航角
  PITCH = 'gimbalPitchRotateAngle', // 俯仰角
  ZOOM = 'zoom', // 变焦
  PHOTO = 'takePhotoType', // 拍照
  ORIENTED_SHOOT = 'orientedShoot', // 定向拍照
  START_RECORD = 'startRecord', // 录像开始
  STOP_RECORD = 'stopRecord', // 录像结束
  PANO_SHOT = 'panoShot', // 全景照片
  HOVER_TIME = 'hoverTime', // 悬停等待
  RECORD_POINT_CLOUD = 'recordPointCloud' // 记录点云
}

// 模拟 DEVICE_MODEL_KEY
export const DEVICE_MODEL_KEY = {
  M30: '0-67-0',
  M30T: '0-67-1',
  M3E: '0-77-0',
  M3T: '0-77-1',
  M300: '0-60-0',
  M350: '0-89-0',
  M3D: '0-91-0',
  M3TD: '0-91-1',
};

// 设备类型对应的动作配置
export const DeviceActionConfigs: Record<string, Record<ActionType, ActionConfig>> = {
  default: {
    [ActionType.YAW]: { min: -180, max: 180, defaultValue: 0, step: 1, label: '飛行器偏航角' },
    [ActionType.PITCH]: { min: -90, max: 35, defaultValue: 0, step: 1, label: '負載俯仰角' },
    [ActionType.ZOOM]: { min: 1, max: 112, defaultValue: 1, step: 1, label: '相機變焦' },
    [ActionType.PHOTO]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '拍照' },
    [ActionType.ORIENTED_SHOOT]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '定向拍照' },
    [ActionType.START_RECORD]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '錄像開始' },
    [ActionType.STOP_RECORD]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '錄像結束' },
    [ActionType.PANO_SHOT]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '全景照片' },
    [ActionType.HOVER_TIME]: { min: 0, max: 1800, defaultValue: 10, step: 1, label: '懸停等待' },
    [ActionType.RECORD_POINT_CLOUD]: { min: 0, max: 1, defaultValue: 0, step: 1, label: '記錄點雲' }
  }
};

// 获取设备对应的动作配置
export function getActionConfig(deviceModelKey: string, actionType: ActionType): ActionConfig {
  const config = DeviceActionConfigs[deviceModelKey] || DeviceActionConfigs.default;
  return config[actionType] || DeviceActionConfigs.default[actionType];
}
