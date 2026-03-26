<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const systemConfig = reactive({
  systemName: '校園汽車違停無人機巡護系統',
  version: '1.0.0',
  autoReport: true,
  storageDays: 30,
  uavHeightLimit: 150,
  uavSpeedLimit: 15
})

const handleSave = () => {
  ElMessage.success('系統設置保存成功')
}
</script>

<template>
  <div class="settings-container p-4 h-full">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div class="px-6 py-4 border-b border-gray-100 flex-between bg-gray-50/50">
        <div class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <el-icon color="#409eff"><Setting /></el-icon>
          系統參數設置
        </div>
        <el-button type="primary" @click="handleSave">
          <el-icon class="mr-1"><Check /></el-icon>保存配置
        </el-button>
      </div>
      
      <div class="flex-1 overflow-auto p-8">
        <el-form :model="systemConfig" label-width="140px" class="max-w-2xl">
          <div class="section-title text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
            <el-icon><Monitor /></el-icon>基礎設置
          </div>
          
          <el-form-item label="系統名稱">
            <el-input v-model="systemConfig.systemName" />
          </el-form-item>
          
          <el-form-item label="當前版本">
            <el-input v-model="systemConfig.version" disabled />
          </el-form-item>
          
          <el-form-item label="數據保存天數">
            <el-input-number v-model="systemConfig.storageDays" :min="1" :max="365" />
            <span class="ml-2 text-gray-400 text-xs">天 (過期數據將自動清理)</span>
          </el-form-item>

          <el-divider />

          <div class="section-title text-sm font-bold text-blue-600 mb-6 mt-8 flex items-center gap-2">
            <el-icon><Promotion /></el-icon>無人機策略
          </div>
          
          <el-form-item label="自動上報違停">
            <el-switch v-model="systemConfig.autoReport" />
            <span class="ml-2 text-gray-400 text-xs">開啟後，AI 辨識到違停車輛將自動寫入數據庫</span>
          </el-form-item>
          
          <el-form-item label="巡航高度限制">
            <el-slider v-model="systemConfig.uavHeightLimit" :max="500" show-input />
            <span class="text-gray-400 text-[10px]">當前限制: {{ systemConfig.uavHeightLimit }}m (符合校園空域規定)</span>
          </el-form-item>
          
          <el-form-item label="最大飛行速度">
            <el-slider v-model="systemConfig.uavSpeedLimit" :max="30" show-input />
            <span class="text-gray-400 text-[10px]">當前限制: {{ systemConfig.uavSpeedLimit }}m/s</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  border-left: 4px solid #409eff;
  padding-left: 12px;
}
</style>
