import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { config } from './config'
import { getAccessToken } from '@/utils/auth'

const { result_code, base_url, request_timeout } = config

const service: AxiosInstance = axios.create({
  baseURL: base_url,
  timeout: request_timeout,
  withCredentials: false
})

// request 拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    }
    const method = config.method?.toUpperCase()
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    return config
  },
  (error: AxiosError) => {
    console.error(error)
    return Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  (response: AxiosResponse<any>) => {
    const { data } = response
    if (!data) {
      throw new Error('API returned no data')
    }
    
    // 兼容 FastAPI 的直接回傳與標準業務回傳 (code/msg)
    // 如果後端返回的是列表或對象（如 FastAPI 的 List[ViolationRecord]），直接返回 data
    if (Array.isArray(data) || (!data.code && !data.msg)) {
      return data
    }

    const code = data.code || result_code
    if (code === 200 || code === 201) {
      return data.data || data
    } else {
      const msg = data.msg || data.message || 'Error occurred'
      ElMessage.error(msg)
      return Promise.reject(new Error(msg))
    }
  },
  (error: AxiosError) => {
    console.error('err' + error)
    let { message } = error
    if (message === 'Network Error') {
      message = 'Network error'
    } else if (message.includes('timeout')) {
      message = 'Request timeout'
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export { service }
