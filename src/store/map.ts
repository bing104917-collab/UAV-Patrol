import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  const viewer = ref<any>(null)
  const isLoaded = ref(false)
  const hasInitiallyLocated = ref(false)

  const setViewer = (v: any) => {
    viewer.value = v
    isLoaded.value = true
  }

  const clearViewer = () => {
    viewer.value = null
    isLoaded.value = false
    hasInitiallyLocated.value = false
  }

  const setInitiallyLocated = (val: boolean) => {
    hasInitiallyLocated.value = val
  }

  return {  
    hasInitiallyLocated,
    setViewer,
    clearViewer,
    setInitiallyLocated
  }
})
