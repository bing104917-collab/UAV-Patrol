import { service } from '@/config/axios/service'

export interface ViolationRecord {
  id?: number
  plate_number: string
  timestamp: string
  location: string
  image_url?: string
}

export const ViolationApi = {
  // 获取违规记录
  getViolations: (params: { plate_number?: string; start_time?: string; end_time?: string }) => {
    return service.get('/api/v1/violations', { params })
  },
  
  // 创建违规记录
  createViolation: (data: ViolationRecord) => {
    return service.post('/api/v1/violations', data)
  }
}

export const PlateRecApi = {
  // 识别车牌
  recognize: (image: File) => {
    const formData = new FormData()
    formData.append('image', image)
    return service.post('/api/v1/rec', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}
