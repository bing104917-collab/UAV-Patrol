<template>
  <div class="editable-value-container">
    <!-- 默认状态：显示值 -->
    <div 
      v-if="!isEditing" 
      class="value-display"
      @click="startEditing"
    >
      {{ displayValue }}<span class="unit-font">{{ unit }}</span>
    </div>
    
    <!-- 编辑状态：显示输入框 -->
    <div v-else class="value-editor">
      <el-input
        ref="inputRef"
        v-model="localValue"
        @blur="handleBlur"
        @keyup.enter="handleEnter"
        :min="min"
        :max="max"
        :step="step"
        class="editor-input"
        autofocus
      />
      <span class="unit" style="font-size: 12px; color: #030303;" >{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

// 定义props
const props = defineProps({
  // 绑定的值
  modelValue: {
    type: [Number, String],
    default: 0
  },
  // 数据类型：'number'或'text'，默认为'number'
  type: {
    type: String,
    default: 'number'
  },
  // 最小值（仅当type为number时有效）
  min: {
    type: Number,
    default: 0
  },
  // 最大值（仅当type为number时有效）
  max: {
    type: Number,
    default: Number.MAX_SAFE_INTEGER
  },
  // 步长（仅当type为number时有效）
  step: {
    type: Number,
    default: 0.1
  },
  // 单位（可选）
  unit: {
    type: String,
    default: ''
  },
  // 是否可编辑
  editable: {
    type: Boolean,
    default: true
  }
})

// 定义emit事件
const emit = defineEmits([
  'update:modelValue',
  'change',
  'edit-start',
  'edit-end'
])

// 编辑状态
const isEditing = ref(false)
// 本地值
const localValue = ref(props.modelValue)
// 输入框引用
const inputRef = ref(null)

// 输入类型
const inputType = computed(() => {
  return props.type === 'number' ? 'number' : 'text'
})

// 显示值
const displayValue = computed(() => {
  return props.modelValue
})

// 监听props变化，更新本地值
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

// 开始编辑
const startEditing = () => {
  if (!props.editable) return
  isEditing.value = true
  emit('edit-start')
  // 确保组件挂载后再聚焦
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 处理失焦
const handleBlur = () => {
  submitEdit()
}

// 处理回车
const handleEnter = () => {
  submitEdit()
}

// 提交编辑
const submitEdit = () => {
  let finalValue = localValue.value
  
  // 如果是数字类型，进行验证和转换
  if (props.type === 'number') {
    // 转换为数字
    finalValue = Number(finalValue)
    
    // 验证范围
    finalValue = Math.max(props.min, Math.min(props.max, finalValue))
    
    // 如果是整数类型，取整
    if (props.step === 1) {
      finalValue = Math.round(finalValue)
    }
  }
  
  // 触发更新事件
  emit('update:modelValue', finalValue)
  emit('change', finalValue)
  emit('edit-end')
  
  // 退出编辑状态
  isEditing.value = false
}
</script>

<style scoped lang="scss">
.editable-value-container {
  display: inline-flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;

  .value-display {
    padding: 4px 8px;
    font-size: inherit;
    font-weight: inherit;
    color: inherit;
    border-radius: 4px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgb(64 158 255 / 10%);
      border-color: rgb(64 158 255 / 20%);
    }
  }
  
  .value-editor {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    
    .editor-input {
      width: 80px;
      margin: 0;
      
      :deep(.el-input__inner) {
        height: 32px;
        padding: 0 8px;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
      }
    }
    
    .unit {
      font-size: 12px;
      font-weight: inherit;
      color: #030303;
    }
  }
  
  .unit-font {
    margin-left: 4px;
    font-size: 12px;
    font-weight: bold;
    color: #030303;
  }
}
</style>