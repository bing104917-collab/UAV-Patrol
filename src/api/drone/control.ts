import { service } from '@/config/axios/service'
import { 
  PostFlyToPointBody, 
  PostTakeoffToPointBody 
} from '@/types/drone'

const API_PREFIX = '/admin-api/dock/device/'

export const DroneControlApi = {
  // 獲取飛行控制權
  postFlightAuth: (sn: string) => {
    return service.post(`${API_PREFIX}/devices/${sn}/authority/flight`)
  },
  
  // 飛向目標點
  postFlyToPoint: (sn: string, body: PostFlyToPointBody) => {
    return service.post(`${API_PREFIX}/devices/${sn}/jobs/fly-to-point`, body)
  },
  
  // 停止飛向目標點
  deleteFlyToPoint: (sn: string) => {
    return service.delete(`${API_PREFIX}/devices/${sn}/jobs/fly-to-point`)
  },
  
  // 一鍵起飛
  postTakeoffToPoint: (sn: string, body: PostTakeoffToPointBody) => {
    return service.post(`${API_PREFIX}/devices/${sn}/jobs/takeoff-to-point`, body)
  }
}
