import request from '@/config/axios'

// Wayline file information VO
export interface WaylineFileVO {
  id: number // 主键ID
  name: string // wayline name
  waylineId: string // uuid
  droneModelKey: string // device product enum. format: domain-device_type-sub_type
  payloadModelKeys: string // payload product enum. format: domain-device_type-sub_type
  workspaceId: string // Which workspace the current wayline belongs to.
  sign: string // The md5 of the wayline file.
  favorited: number // Whether the file is favorited or not.
  templateTypes: string // wayline file template type. 0: waypoint;
  objectKey: string // The key of the file in the bucket.
  userName: string // The name of the creator.
  url: string // 航线文件路径.
}

// 经纬度坐标
export interface Position {
  longitude: number
  latitude: number
  height: number
}

// 测量信息
export interface Measurements {
  horizontalDistance?: number
  straightDistance?: number
  heightDifference?: number
  horizontalArea?: number
  horizontalPerimeter?: number
}

// 要素信息 (Element/Feature)
export interface WaylineElement {
  id: string
  dbId?: number // 数据库主键ID
  elementId?: string // 业务ID
  name: string
  type: 'point' | 'polyline' | 'polygon'
  position?: Position
  positions?: Position[]
  measurements?: Measurements
  remarks?: string
  visible: boolean
  color?: string
  entity?: any // Cesium.Entity
  points?: any[] // Cesium.Entity[]
  segmentLabels?: any[] // 存储线段长度标签实体 Cesium.Entity[]
  highlightEntity?: any // 存储高亮实体 Cesium.Entity
  createTime?: number // 创建时间戳
  isIntersecting?: boolean // 是否自相交
  intersectingSegments?: number[] // 自相交的线段索引
}

// Wayline file information API
export const WaylineFileApi = {
  // 查询Wayline file information分页
  getWaylineFilePage: async (params: any) => {
    return await request.get({ url: `/dock/wayline-file/page`, params })
  },

  // 查询要素列表分页
  getElementPage: async (params: any) => {
    return await request.get({ url: `/dock/elements/page`, params })
  },

  // 创建要素
  createElement: async (data: any) => {
    return await request.post({ url: `/dock/elements/create`, data })
  },

  // 查询Wayline file information详情
  getWaylineFile: async (id: number) => {
    return await request.get({ url: `/dock/wayline-file/get?id=` + id })
  },

  // 校验文件名唯一性
  checkWaylineFileName: async (fileName: string) => {
    return await request.get({ url: `/dock/wayline-route/checkFileName?fileName=${fileName}` })
  },

  // 新增Wayline file information
  createWaylineFile: async (data: WaylineFileVO) => {
    return await request.post({ url: `/dock/wayline-route/build`, data })
  },

  // 新增Wayline file information Base
  createWaylineFileBase: async (data: WaylineFileVO) => {
    return await request.post({ url: `/dock/wayline-file/create`, data })
  },

  // 修改Wayline file information
  updateWaylineFile: async (data: any) => {
    return await request.post({ url: `/dock/wayline-route/update`, data })
  },

  // 修改Wayline file Base
  updateWaylineFileBase: async (data: any) => {
    return await request.put({ url: `/dock/wayline-file/update`, data })
  },

  // 删除Wayline file information
  deleteWaylineFile: async (id: number) => {
    return await request.delete({ url: `/dock/wayline-file/delete?id=` + id })
  },

  // 导出Wayline file information Excel
  exportWaylineFile: async (params: any) => {
    return await request.download({ url: `/dock/wayline-file/export-excel`, params })
  },

  // 查询航线列表opitons
  getWaylineFileList: async () => {
    return await request.get({ url: `/dock/wayline-file/list` })
  },
}

