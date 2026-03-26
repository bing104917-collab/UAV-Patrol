<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ViolationApi, ViolationRecord } from '@/api/violation'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const list = ref<ViolationRecord[]>([])
const queryParams = ref({
  plate_number: '',
  start_time: '',
  end_time: ''
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await ViolationApi.getViolations(queryParams.value)
    list.value = (res as any) || []
  } catch (e) {
    ElMessage.error('獲取數據失敗')
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  loadData()
}

const resetQuery = () => {
  queryParams.value = {
    plate_number: '',
    start_time: '',
    end_time: ''
  }
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="violation-management p-4 h-full flex flex-col gap-4">
    <!-- 搜索欄 -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <el-form :inline="true" :model="queryParams" class="!mb-0">
        <el-form-item label="車牌號碼">
          <el-input v-model="queryParams.plate_number" placeholder="請輸入車牌" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="時間範圍">
          <el-date-picker
            v-model="queryParams.start_time"
            type="datetime"
            placeholder="開始時間"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
          <span class="mx-2 text-gray-400">-</span>
          <el-date-picker
            v-model="queryParams.end_time"
            type="datetime"
            placeholder="結束時間"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon class="mr-1"><Search /></el-icon>查詢
          </el-button>
          <el-button @click="resetQuery">
            <el-icon class="mr-1"><Refresh /></el-icon>重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格區 -->
    <div class="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div class="flex-between mb-4">
        <div class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <el-icon color="#f56c6c"><Warning /></el-icon>
          違規紀錄清單
        </div>
        <el-button type="success" plain size="small">
          <el-icon class="mr-1"><Download /></el-icon>導出報表
        </el-button>
      </div>
      
      <el-table :data="list" v-loading="loading" class="flex-1" border stripe>
        <el-table-column type="index" label="序號" width="60" align="center" />
        <el-table-column prop="plate_number" label="車牌號碼" width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="dark" class="!font-mono !font-bold">{{ row.plate_number }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="違規時間" width="180" align="center">
          <template #default="{ row }">
            {{ new Date(row.timestamp).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="違規地點" min-width="200" />
        <el-table-column label="證據圖片" width="120" align="center">
          <template #default="{ row }">
            <el-image 
              v-if="row.image_url"
              :src="row.image_url" 
              :preview-src-list="[row.image_url]"
              class="w-10 h-10 rounded shadow-sm hover:scale-110 transition-transform cursor-pointer"
              fit="cover"
            />
            <span v-else class="text-gray-400 text-xs">暫無圖片</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default>
            <el-button type="primary" link size="small">詳情</el-button>
            <el-button type="danger" link size="small">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-table__header) {
  background-color: #f8fafc !important;
}
</style>
