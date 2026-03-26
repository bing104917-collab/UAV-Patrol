import { service } from './service'
import { config } from './config'

const { default_headers } = config

const request = (option: any) => {
  const { headersType, headers, ...otherOption } = option
  return service({
    ...otherOption,
    headers: {
      'Content-Type': headersType || default_headers,
      ...headers
    }
  })
}

export default {
  get: async <T = any>(option: any) => {
    return await request({ method: 'GET', ...option })
  },
  post: async <T = any>(option: any) => {
    return await request({ method: 'POST', ...option })
  },
  delete: async <T = any>(option: any) => {
    return await request({ method: 'DELETE', ...option })
  },
  put: async <T = any>(option: any) => {
    return await request({ method: 'PUT', ...option })
  },
  download: async <T = any>(option: any) => {
    return await request({ method: 'GET', responseType: 'blob', ...option })
  },
  upload: async <T = any>(option: any) => {
    option.headersType = 'multipart/form-data'
    return await request({ method: 'POST', ...option })
  }
}
