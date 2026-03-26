<template>
  <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" append-to-body>
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px" v-loading="formLoading">
      <el-form-item label="航線名稱" prop="name">
        <el-input v-model="formData.name" placeholder="請輸入航線名稱" />
      </el-form-item>

      <el-form-item label="航線類型" prop="templateTypes">
        <el-select v-model="formData.templateTypes" placeholder="請選擇航線類型" class="w-full">
          <el-option
            v-for="dict in templateTypesOptions"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="綁定無人機" prop="deviceSn">
        <el-select v-model="formData.deviceSn" placeholder="請選擇要綁定的無人機" class="w-full">
          <el-option
            v-for="item in deviceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="航線文件" prop="url">
        <el-upload
          class="upload-demo"
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          :file-list="fileList"
          accept=".kmz,.json"
        >
          <el-button type="primary">選擇文件</el-button>
          <template #tip>
            <div class="el-upload__tip text-gray-400">
              請上傳 .kmz 或 .json 格式的航線文件
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button @click="submitForm" type="primary" :disabled="formLoading">確 定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { WaylineFileApi, WaylineFileVO } from '@/api/wayline'
import { DeviceApi } from '@/api/drone/device'

defineOptions({ name: 'WaylineFileForm' })

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('') // create, update, rename
const formData = ref<any>({
  id: undefined,
  name: undefined,
  deviceSn: undefined,
  templateTypes: undefined,
  url: undefined,
})

const fileList = ref<any[]>([])

const templateTypesOptions = [
  { value: '0', label: '航點航線' },
  { value: '1', label: '面狀航線' },
  { value: '2', label: '帶狀航線' }
]

const deviceOptions = ref<any[]>([])

const getDeviceList = async () => {
  try {
    const data = await DeviceApi.getDeviceList()
    deviceOptions.value = data.map((item: any) => ({
      value: item.deviceSn,
      label: `${item.deviceName} (${item.deviceSn})`
    }))
  } catch (error) {
    console.error('Failed to get device list:', error)
  }
}

const formRules = {
  name: [{ required: true, message: '航線名稱不能為空', trigger: 'blur' }],
  templateTypes: [{ required: true, message: '航線類型不能為空', trigger: 'change' }],
  deviceSn: [{ required: true, message: '無人機不能為空', trigger: 'change' }],
  url: [{ required: true, message: '航線文件不能為空', trigger: 'change' }]
}

const formRef = ref()

const handleFileChange = (file: any) => {
  formData.value.url = file.name // 這裡暫時只記錄文件名，實際應上傳後獲取 URL
  fileList.value = [file]
}

/** 打開彈窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  formType.value = type
  if (type === 'create') {
    dialogTitle.value = '導入航線'
  } else if (type === 'rename') {
    dialogTitle.value = '重命名航線'
  } else {
    dialogTitle.value = '修改航線'
  }
  
  resetForm()
  await getDeviceList()
  
  if (id) {
    formLoading.value = true
    try {
      const data = await WaylineFileApi.getWaylineFile(id)
      formData.value = { ...data }
      if (formData.value.url) {
        fileList.value = [{ name: formData.value.url, url: formData.value.url }]
      }
    } catch (error) {
      console.error('Failed to get wayline details:', error)
    } finally {
      formLoading.value = false
    }
  }
}

defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate()
  
  formLoading.value = true
  try {
    const data = formData.value as WaylineFileVO
    if (formType.value === 'create') {
      await WaylineFileApi.createWaylineFileBase(data)
      ElMessage.success('創建成功')
    } else {
      await WaylineFileApi.updateWaylineFileBase(data)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = {
    id: undefined,
    name: undefined,
    deviceSn: undefined,
    templateTypes: undefined,
    url: undefined,
  }
  fileList.value = []
  formRef.value?.resetFields()
}
</script>
