<template>
  <div class="height-input-container">
    <div class="height-controls">
      <div class="control-row">
        <el-button size="small" @click="handleIncrement(100)">+100</el-button>
      </div>
      <div class="control-row">
        <el-button size="small" @click="handleIncrement(10)">+10</el-button>
      </div>
      <div class="control-row input-row">
        <div class="input-wrapper">
          <el-input
            v-model="localValue"
            @input="handleInput"
            size="small"
            :min="min"
            :max="max"
          />
          <span class="unit">{{ unit }}</span>
        </div>
      </div>
      <div class="control-row">
        <el-button size="small" @click="handleIncrement(-10)">-10</el-button>
      </div>
      <div class="control-row">
        <el-button size="small" @click="handleIncrement(-100)">-100</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  min: {
    type: Number,
    default: 1
  },
  max: {
    type: Number,
    default: 1000
  },
  step: {
    type: Number,
    default: 0.1
  },
  unit: {
    type: String,
    default: 'm'
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用本地值进行双向绑定
const localValue = ref(props.modelValue)

// 监听props变化，更新本地值
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue
})

// 处理输入变化
const handleInput = () => {
  let newValue = Number(localValue.value)
  // 验证数值范围
  newValue = Math.max(props.min, Math.min(props.max, isNaN(newValue) ? props.min : newValue))
  localValue.value = newValue
  emit('update:modelValue', newValue)
}

// 处理增减按钮
const handleIncrement = (amount) => {
  const newValue = Math.max(props.min, Math.min(props.max, localValue.value + amount))
  localValue.value = newValue
  emit('update:modelValue', newValue)
}
</script>

<style scoped lang="scss">
.height-input-container {
  width: 100%;
  
  .height-controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .control-row {
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.input-row {
        .input-wrapper {
          position: relative;
          width: 60px; // 与按钮宽度一致
          
          .unit {
            position: absolute;
            top: 50%;
            right: -14px;
            font-size: 12px;
            color: #666;
            pointer-events: none;
            transform: translateY(-50%);
          }
        }
      }
      
      .el-button {
        width: 60px;
      }
      
      // 单独处理 el-input 样式
      :deep(.el-input) {
        width: 60px;
      }
      
      // 处理 el-input__inner 样式
      :deep(.el-input__inner) {
        font-size: 17px !important; // 调整字体大小到20px
        font-weight: bold !important; // 加粗
        color: var(--el-color-primary) !important; // 颜色变为primary色
        text-align: center !important;
      }
    }
  }
}
</style>