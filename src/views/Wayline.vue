<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Upload, MapLocation } from '@element-plus/icons-vue'
import { WaylineFileApi } from '@/api/wayline'
import { dateFormatter } from '@/utils/formatTime'
import WaylineFileForm from './WaylineFileForm.vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'Wayline' })

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: ''
})

const getList = async () => {
  loading.value = true
  try {
    const data = await WaylineFileApi.getWaylineFilePage(queryParams)
    list.value = data.list
    total.value = data.total
  } catch (error) {
    console.error('Failed to get wayline list:', error)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.name = ''
  handleQuery()
}

const formRef = ref()

const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

const openWayLineGenerator = (type: string, id?: number) => {
  if (type === 'create') {
    router.push('/wayline/generator')
  } else {
    router.push({
      path: '/wayline/generator',
      query: { id: id }
    })
  }
}

const handleDelete = (id: number) => {
  ElMessageBox.confirm('確定要刪除該航線嗎？', '提示', {
    type: 'warning'
  }).then(async () => {
    try {
      await WaylineFileApi.deleteWaylineFile(id)
      ElMessage.success('刪除成功')
      getList()
    } catch (error) {
      console.error('Delete error:', error)
    }
  })
}

const handleRowClick = (row: any) => {
  // 可以選擇預覽或選中
  console.log('Row clicked:', row)
}

onMounted(() => {
  getList()
})
</script>

<template>
  <div class="wayline-container p-4 h-full flex flex-col gap-4">
    <!-- 搜索工作欄 -->
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <el-form :inline="true" :model="queryParams" class="!mb-0">
        <el-form-item label="航線名稱">
          <el-input v-model="queryParams.name" placeholder="請輸入航線名稱" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon class="mr-1"><Search /></el-icon>搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon class="mr-1"><Refresh /></el-icon>重置
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="mt-4 flex gap-2">
        <el-button type="primary" plain @click="openWayLineGenerator('create')">
          <el-icon class="mr-1"><Plus /></el-icon>創建航線
        </el-button>
        <el-button type="warning" plain @click="openForm('create')">
          <el-icon class="mr-1"><Upload /></el-icon>導入航線
        </el-button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div class="flex-between mb-4">
        <div class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <el-icon color="#409eff"><MapLocation /></el-icon>
          航線檔案管理
        </div>
      </div>

      <el-table 
        v-loading="loading" 
        :data="list" 
        border
        stripe
        @row-click="handleRowClick"
        class="flex-1 cursor-pointer"
      >
        <el-table-column label="航線名稱" align="center" prop="name" min-width="150" />
        <el-table-column label="適用無人機" align="center" prop="deviceSn" width="180">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.deviceName">{{ row.deviceName }}</el-tag>
            <span v-else>{{ row.deviceSn || '--' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="航線類型" align="center" prop="templateTypes" width="120">
          <template #default="{ row }">
            <el-tag :type="row.templateTypes === '1' ? 'primary' : 'warning'" size="small">
              {{ row.templateTypes === '1' ? '面狀航線' : (row.templateTypes === '0' ? '航點航線' : '帶狀航線') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="創建時間" align="center" prop="createTime" width="180">
          <template #default="{ row }">
            {{ row.createTime ? dateFormatter(null, null, row.createTime) : '--' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openWayLineGenerator('update', row.id)">編輯航線</el-button>
            <el-button link type="primary" @click.stop="openForm('update', row.id)">重命名</el-button>
            <el-button link type="danger" @click.stop="handleDelete(row.id)">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="queryParams.pageNo"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="getList"
          @current-change="getList"
        />
      </div>
    </div>

    <!-- 表單彈窗 -->
    <WaylineFileForm ref="formRef" @success="getList" />
  </div>
</template>

<style scoped>
:deep(.el-table__header) {
  background-color: #f8fafc !important;
}
</style>
