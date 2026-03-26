import { ref } from 'vue'

export function useMapCursorHooks(customCursorRef) {
  
  const setCustomCursor = (x, y) => {
    if (customCursorRef) {
      customCursorRef.value = {
        x: x,
        y: y
      }
    }
  }

  const clearCustomCursor = () => {
    if (customCursorRef) {
      customCursorRef.value = null
    }
  }

  return { setCustomCursor, clearCustomCursor }
}