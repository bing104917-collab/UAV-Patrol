<template>
  <div class="gsd-input-container">
    <div class="gsd-controls">
      <!-- 根据step动态显示调整按钮 -->
      <template v-if="step === 1">
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(-5)" :disabled="isMinReached(-5)">-5</el-button>
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(-1)" :disabled="isMinReached(-1)">-1</el-button>
        </div>
        <div class="input-wrapper">
          <EditableValue
            v-model="localValue"
            type="number"
            :min="min"
            :max="max"
            :step="step"
            :unit="unit"
            class="gsd-input"
          />
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(1)" :disabled="isMaxReached(1)">+1</el-button>
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(5)" :disabled="isMaxReached(5)">+5</el-button>
        </div>
      </template>
      <template v-else>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(-1)" :disabled="isMinReached(-1)">-1</el-button>
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(-0.1)" :disabled="isMinReached(-0.1)">-0.1</el-button>
        </div>
        <div class="input-wrapper">
          <EditableValue
            v-model="localValue"
            type="number"
            :min="min"
            :max="max"
            :step="step"
            :unit="unit"
            class="gsd-input"
          />
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(0.1)" :disabled="isMaxReached(0.1)">+0.1</el-button>
        </div>
        <div class="button-wrapper">
          <el-button size="small" @click="handleIncrement(1)" :disabled="isMaxReached(1)">+1</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch, computed } from 'vue'
import EditableValue from './EditableValue.vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 10
  },
  min: {
    type: Number,
    default: 1
  },
  max: {
    type: Number,
    default: 50
  },
  step: {
    type: Number,
    default: 0.01
  },
  unit: {
    type: String,
    default: 'cm/pixel'
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用本地值进行双向绑定
const localValue = ref(props.modelValue)

// 计算属性：检查是否达到最小值
const isMinReached = (amount) => {
  return computed(() => {
    const newValue = Number(localValue.value) + amount
    return newValue <= props.min
  }).value
}

// 计算属性：检查是否达到最大值
const isMaxReached = (amount) => {
  return computed(() => {
    const newValue = Number(localValue.value) + amount
    return newValue >= props.max
  }).value
}

// 监听props变化，更新本地值
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

// 监听本地值变化，触发emit事件
watch(localValue, (newValue) => {
  handleInput()
})

// 处理输入变化
const handleInput = () => {
  let newValue = Number(localValue.value)
  // 验证数值范围
  newValue = Math.max(props.min, Math.min(props.max, isNaN(newValue) ? props.min : newValue))
  localValue.value = parseFloat(newValue.toFixed(1)) // 保留1位小数
  emit('update:modelValue', localValue.value)
}

// 处理增减按钮
const handleIncrement = (amount) => {
  const newValue = Math.max(props.min, Math.min(props.max, Number(localValue.value) + amount))
  localValue.value = parseFloat(newValue.toFixed(1)) // 保留1位小数
  emit('update:modelValue', localValue.value)
}
</script>

<style scoped lang="scss">
.gsd-input-container {
  width: 100%;
  
  .gsd-controls {
    display: flex;
    flex-direction: row;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: #f5f7fa;
    border-radius: 8px;
    
    .el-button {
      width: 40px;
      height: 32px;
      padding: 0;
      font-size: 12px;
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      transition: all 0.3s ease;
      
      &:hover {
        color: #409eff;
        background: #ecf5ff;
        border-color: #409eff;
      }
    }
    
    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      
      .gsd-input {
        min-width: 120px;
        text-align: center;
        
        /* EditableValue 组件样式 */
        :deep(.editable-value-container) {
          font-size: 20px;
          font-weight: bold;
          color: var(--el-color-primary);
        }
        
        /* 显示状态样式 */
        :deep(.value-display) {
          font-size: 20px;
          font-weight: bold;
          color: var(--el-color-primary);
          
          .unit-font {
            margin-left: 4px;
            font-size: 12px;
            font-weight: normal;
            color: #030303; /* 使用默认颜色 */
          }
        }
        
        /* 编辑状态样式 */
        :deep(.value-editor) {
          font-size: 20px;
          font-weight: bold;
          color: var(--el-color-primary);
          
          .editor-input {
            width: 100px;
            
            :deep(.el-input__inner) {
              height: 32px;
              padding: 0 8px;
              font-size: 20px;
              font-weight: bold;
              color: var(--el-color-primary);
              text-align: center;
              border: 1px solid #dcdfe6;
              border-radius: 4px;
            }
          }
          
          .unit {
            font-size: 10px;
            font-weight: normal;
            color: inherit; /* 使用默认颜色 */
          }
        }
      }
    }
  }
}
</style>