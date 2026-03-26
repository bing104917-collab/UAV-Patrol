import request from '@/config/axios'

// 任务执行记录 VO
export interface WaylineJobVO {
  id: number // 主键
  jobId: string // uuid
  name: string // 名称
  fileId: string // 航线id
  dockSn: string // 设备SN
  workspaceId: string // 空间
  taskType: number // 任务类型
  waylineType: number // 航线类型
  executeTime: number // 执行时间
  completedTime: number // 结束时间
  username: string // 下发人
  beginTime: number // planned begin time
  endTime: number // planned end time
  errorCode: number // 错误code
  status: number // 1: pending; 2: in progress; 3: success; 4: cancel; 5: failed
  rthAltitude: number // return to home altitude. min: 20m; max: 500m
  outOfControl: number // out of control action. 0: go home; 1: hover; 2: landing;
  mediaCount: number // 数量
  parentId: string // 父级
  taskId: number // 任务ID
}

// 任务执行记录 API
export const WaylineJobApi = {
  // 查询任务执行记录分页
  getWaylineJobPage: async (params: any) => {
    return await request.get({ url: `/dock/wayline-job/page`, params })
  },

  // 查询任务执行记录详情
  getWaylineJob: async (id: number) => {
    return await request.get({ url: `/dock/wayline-job/get?id=` + id })
  },

  // 新增任务执行记录
  createWaylineJob: async (data: WaylineJobVO) => {
    return await request.post({ url: `/dock/wayline-job/create`, data })
  },

  // 修改任务执行记录
  updateWaylineJob: async (data: WaylineJobVO) => {
    return await request.put({ url: `/dock/wayline-job/update`, data })
  },

  // 删除任务执行记录
  deleteWaylineJob: async (id: number) => {
    return await request.delete({ url: `/dock/wayline-job/delete?id=` + id })
  },

  // 导出任务执行记录 Excel
  exportWaylineJob: async (params) => {
    return await request.download({ url: `/dock/wayline-job/export-excel`, params })
  },
}
