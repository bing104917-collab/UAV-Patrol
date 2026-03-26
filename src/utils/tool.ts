import { BASE_FOVBYMAP, MAX_ZOOM } from "./constants"

// 计算当前FOV
export const calculateFov = (zoomLevel: number): number => {
  // 确保zoomLevel在有效范围内
  const clampedZoom = Math.max(1, Math.min(zoomLevel, MAX_ZOOM))

  // FOV与变焦倍数成反比
  return BASE_FOVBYMAP / clampedZoom
}

export function debounce(fn: Function, delay: number) {
  let timer: any
  return function (this: any, ...args: any[]) {
    const context = this
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(context, args)
    }, delay)
  }
}
