<script lang="ts" setup>
import { computed, unref, ref, nextTick, watch } from 'vue'

defineOptions({ name: 'Icon' })

const props = defineProps({
  // icon name
  icon: {
    type: String,
    required: true
  },
  // icon color
  color: {
    type: String,
    default: ''
  },
  // icon size
  size: {
    type: Number,
    default: 16
  },
  // icon svg class
  svgClass: {
    type: String,
    default: ''
  }
})

const elRef = ref<HTMLElement | null>(null)

const isLocal = computed(() => props.icon?.startsWith('svg-icon:'))

const symbolId = computed(() => {
  return unref(isLocal) ? `#icon-${props.icon.split('svg-icon:')[1]}` : props.icon
})

const getIconifyStyle = computed(() => {
  const { color, size } = props
  return {
    fontSize: `${size}px`,
    height: '1em',
    color
  }
})

const getSvgClass = computed(() => {
  const { svgClass } = props
  return `iconify ${svgClass}`
})

const updateIcon = async (icon: string) => {
  if (unref(isLocal)) return
  // 如果不是本地 SVG，可以考虑集成 iconify 或者直接不处理
}

watch(
  () => props.icon,
  (icon: string) => {
    updateIcon(icon)
  }
)
</script>

<template>
  <el-icon class="app-icon" :color="color" :size="size">
    <svg v-if="isLocal" :class="getSvgClass" aria-hidden="true">
      <use :xlink:href="symbolId" />
    </svg>
    <span v-else ref="elRef" :style="getIconifyStyle">
      <span :class="getSvgClass" :data-icon="symbolId"></span>
    </span>
  </el-icon>
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
