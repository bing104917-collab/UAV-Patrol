const AccessTokenKey = 'ACCESS_TOKEN'
const RefreshTokenKey = 'REFRESH_TOKEN'

export const getAccessToken = () => {
  return localStorage.getItem(AccessTokenKey)
}

export const getRefreshToken = () => {
  return localStorage.getItem(RefreshTokenKey)
}

export const setToken = (token: { accessToken: string; refreshToken: string }) => {
  localStorage.setItem(AccessTokenKey, token.accessToken)
  localStorage.setItem(RefreshTokenKey, token.refreshToken)
}

export const removeToken = () => {
  localStorage.removeItem(AccessTokenKey)
  localStorage.removeItem(RefreshTokenKey)
}

export const formatToken = (token: string): string => {
  return 'Bearer ' + token
}

export const getTenantId = () => {
  return localStorage.getItem('TENANT_ID')
}
