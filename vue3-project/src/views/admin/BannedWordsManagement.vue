<template>
  <div class="banned-words-page">
    <!-- 功能说明 -->
    <div class="feature-info">
      <div class="info-header">
        <span class="info-icon">ℹ️</span>
        <span class="info-text">本地违禁词管理</span>
      </div>
      <div class="info-content">
        <p>• 支持通配符：<code>*</code> 匹配任意字符，<code>?</code> 匹配单个字符</p>
        <p>• 包含通配符的词条会自动设为正则模式</p>
        <p>• 触发违禁词后将直接拒绝，不发送AI审核</p>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="action-bar">
      <div class="action-left">
        <button class="btn btn-primary" @click="showAddModal = true">
          <span class="btn-icon">+</span> 添加违禁词
        </button>
        <button class="btn btn-secondary" @click="showImportModal = true">
          <span class="btn-icon">📥</span> 批量导入
        </button>
      </div>
      <div class="action-right">
        <select v-model="exportType" class="export-select">
          <option value="">选择导出类型</option>
          <option value="1">用户名/昵称</option>
          <option value="2">评论内容</option>
          <option value="3">个人简介</option>
        </select>
        <button class="btn btn-outline" @click="handleExport" :disabled="!exportType">
          <span class="btn-icon">📤</span> 导出
        </button>
      </div>
    </div>

    <CrudTable title="违禁词管理" entity-name="违禁词" api-endpoint="/admin/banned-words" 
      :columns="columns" :form-fields="formFields" :search-fields="searchFields" />

    <!-- 消息提示 -->
    <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />

    <!-- 添加违禁词弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加违禁词</h3>
          <button class="close-btn" @click="showAddModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>违禁词</label>
            <input type="text" v-model="newWord.word" placeholder="输入违禁词，支持 * 和 ? 通配符" />
          </div>
          <div class="form-group">
            <label>类型</label>
            <select v-model="newWord.type">
              <option :value="1">用户名/昵称</option>
              <option :value="2">评论内容</option>
              <option :value="3">个人简介</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="newWord.is_regex" />
              正则模式
            </label>
            <span class="hint">包含通配符时自动启用</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddModal = false">取消</button>
          <button class="btn btn-primary" @click="handleAddWord">添加</button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal-content import-modal" @click.stop>
        <div class="modal-header">
          <h3>批量导入违禁词</h3>
          <button class="close-btn" @click="showImportModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>类型</label>
            <select v-model="importData.type">
              <option :value="1">用户名/昵称</option>
              <option :value="2">评论内容</option>
              <option :value="3">个人简介</option>
            </select>
          </div>
          <div class="form-group">
            <label>导入方式</label>
            <div class="import-tabs">
              <button 
                class="tab-btn" 
                :class="{ active: importData.mode === 'text' }"
                @click="importData.mode = 'text'"
              >手动输入</button>
              <button 
                class="tab-btn" 
                :class="{ active: importData.mode === 'file' }"
                @click="importData.mode = 'file'"
              >TXT文件导入</button>
            </div>
          </div>
          <!-- 手动输入模式 -->
          <div v-if="importData.mode === 'text'" class="form-group">
            <label>违禁词列表（每行一个）</label>
            <textarea v-model="importData.text" rows="10" placeholder="每行输入一个违禁词&#10;支持 * 和 ? 通配符&#10;例如:&#10;敏感词1&#10;敏感*词&#10;test?word"></textarea>
          </div>
          <!-- 文件导入模式 -->
          <div v-if="importData.mode === 'file'" class="form-group">
            <label>选择TXT文件</label>
            <div class="file-upload-area">
              <input 
                type="file" 
                ref="fileInput"
                accept=".txt"
                @change="handleFileSelect"
                class="file-input"
              />
              <div v-if="!importData.fileName" class="file-placeholder">
                <span class="file-icon">📄</span>
                <span>点击或拖拽TXT文件到此处</span>
                <span class="file-hint">每行一个违禁词</span>
              </div>
              <div v-else class="file-selected">
                <span class="file-icon">✅</span>
                <span>{{ importData.fileName }}</span>
                <span class="file-count">{{ importData.wordCount }} 个词</span>
                <button class="clear-file-btn" @click="clearFile">×</button>
              </div>
            </div>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="importData.isRegex" />
              <span>全部设为正则模式</span>
            </label>
            <span class="hint">启用后，所有导入的词条都将使用通配符匹配</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="handleImport">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CrudTable from './components/CrudTable.vue'
import MessageToast from '@/components/MessageToast.vue'
import { apiConfig } from '@/config/api'

// 消息提示状态
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 弹窗状态
const showAddModal = ref(false)
const showImportModal = ref(false)

// 导出类型
const exportType = ref('')

// 文件输入引用
const fileInput = ref(null)

// 新增违禁词表单
const newWord = ref({
  word: '',
  type: 1,
  is_regex: false
})

// 批量导入数据
const importData = ref({
  type: 1,
  text: '',
  mode: 'text',
  fileName: '',
  wordCount: 0,
  fileWords: [],
  isRegex: false
})

// 监听违禁词内容，自动设置正则模式
watch(() => newWord.value.word, (val) => {
  if (val && (val.includes('*') || val.includes('?'))) {
    newWord.value.is_regex = true
  }
})

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
    showMessage('请选择TXT文件', 'error')
    return
  }
  
  // 验证文件大小（限制2MB）
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    showMessage('文件过大，请选择小于2MB的文件', 'error')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    // 处理Windows和Unix换行符
    const words = content.split(/\r?\n/).filter(w => w.trim()).map(w => w.trim())
    importData.value.fileName = file.name
    importData.value.wordCount = words.length
    importData.value.fileWords = words
  }
  reader.onerror = () => {
    showMessage('文件读取失败', 'error')
  }
  reader.readAsText(file, 'UTF-8')
}

// 清除文件
const clearFile = () => {
  importData.value.fileName = ''
  importData.value.wordCount = 0
  importData.value.fileWords = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 消息提示方法
const showMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const handleToastClose = () => {
  showToast.value = false
}

// 获取认证头
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  const token = localStorage.getItem('admin_token')
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

// 添加违禁词
const handleAddWord = async () => {
  if (!newWord.value.word.trim()) {
    showMessage('请输入违禁词', 'error')
    return
  }

  try {
    const response = await fetch(`${apiConfig.baseURL}/admin/banned-words`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newWord.value)
    })
    const result = await response.json()
    if (result.code === 200) {
      showMessage('添加成功')
      showAddModal.value = false
      newWord.value = { word: '', type: 1, is_regex: false }
      location.reload()
    } else {
      showMessage('添加失败: ' + result.message, 'error')
    }
  } catch (error) {
    console.error('添加失败:', error)
    showMessage('添加失败', 'error')
  }
}

// 批量导入
const handleImport = async () => {
  // 根据导入模式获取词列表
  let words = []
  if (importData.value.mode === 'file') {
    words = importData.value.fileWords
  } else {
    words = importData.value.text.split('\n').filter(w => w.trim())
  }
  
  if (words.length === 0) {
    showMessage('请输入或选择违禁词文件', 'error')
    return
  }

  try {
    const response = await fetch(`${apiConfig.baseURL}/admin/banned-words/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: importData.value.type,
        words: words,
        isRegex: importData.value.isRegex
      })
    })
    const result = await response.json()
    if (result.code === 200) {
      showMessage(`成功导入 ${result.data.count} 个违禁词`)
      showImportModal.value = false
      importData.value = { type: 1, text: '', mode: 'text', fileName: '', wordCount: 0, fileWords: [], isRegex: false }
      location.reload()
    } else {
      showMessage('导入失败: ' + result.message, 'error')
    }
  } catch (error) {
    console.error('导入失败:', error)
    showMessage('导入失败', 'error')
  }
}

// 导出违禁词
const handleExport = async () => {
  if (!exportType.value) {
    showMessage('请选择导出类型', 'error')
    return
  }

  try {
    const response = await fetch(`${apiConfig.baseURL}/admin/banned-words/export/${exportType.value}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
    const result = await response.json()
    if (result.code === 200) {
      // 创建下载
      const content = result.data.words.join('\n')
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const typeNames = { '1': 'username', '2': 'comment', '3': 'bio' }
      a.download = `banned_words_${typeNames[exportType.value] || 'all'}_${Date.now()}.txt`
      a.click()
      URL.revokeObjectURL(url)
      showMessage(`成功导出 ${result.data.count} 个违禁词`)
    } else {
      showMessage('导出失败: ' + result.message, 'error')
    }
  } catch (error) {
    console.error('导出失败:', error)
    showMessage('导出失败', 'error')
  }
}

// 表格列定义
const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'word', label: '违禁词', sortable: false },
  {
    key: 'type',
    label: '类型',
    type: 'status',
    sortable: true,
    statusMap: {
      1: { text: '用户名/昵称', class: 'type-username' },
      2: { text: '评论内容', class: 'type-comment' },
      3: { text: '个人简介', class: 'type-bio' }
    }
  },
  {
    key: 'is_regex',
    label: '正则模式',
    type: 'status',
    sortable: false,
    statusMap: {
      true: { text: '是', class: 'status-yes' },
      false: { text: '否', class: 'status-no' }
    }
  },
  {
    key: 'enabled',
    label: '状态',
    type: 'status',
    sortable: true,
    statusMap: {
      true: { text: '启用', class: 'status-enabled' },
      false: { text: '禁用', class: 'status-disabled' }
    }
  },
  { key: 'created_at', label: '创建时间', type: 'date', sortable: true }
]

// 表单字段定义
const formFields = computed(() => [
  { key: 'word', label: '违禁词', type: 'text', required: true, placeholder: '输入违禁词，支持 * 和 ? 通配符' },
  {
    key: 'type',
    label: '类型',
    type: 'select',
    required: true,
    options: [
      { value: 1, label: '用户名/昵称' },
      { value: 2, label: '评论内容' },
      { value: 3, label: '个人简介' }
    ]
  },
  {
    key: 'is_regex',
    label: '正则模式',
    type: 'select',
    required: false,
    options: [
      { value: false, label: '否' },
      { value: true, label: '是' }
    ]
  },
  {
    key: 'enabled',
    label: '状态',
    type: 'select',
    required: false,
    options: [
      { value: true, label: '启用' },
      { value: false, label: '禁用' }
    ]
  }
])

// 搜索字段定义
const searchFields = [
  { key: 'word', label: '违禁词', placeholder: '搜索违禁词' },
  {
    key: 'type',
    label: '类型',
    type: 'select',
    placeholder: '选择类型',
    options: [
      { value: '', label: '全部类型' },
      { value: '1', label: '用户名/昵称' },
      { value: '2', label: '评论内容' },
      { value: '3', label: '个人简介' }
    ]
  },
  {
    key: 'enabled',
    label: '状态',
    type: 'select',
    placeholder: '选择状态',
    options: [
      { value: '', label: '全部状态' },
      { value: 'true', label: '启用' },
      { value: 'false', label: '禁用' }
    ]
  }
]
</script>

<style scoped>
.banned-words-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.feature-info {
  margin: 16px 24px;
  padding: 16px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-icon {
  font-size: 16px;
}

.info-text {
  font-weight: 600;
  color: var(--text-color-primary);
}

.info-content {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.info-content p {
  margin: 4px 0;
}

.info-content code {
  background: var(--bg-color-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 16px;
}

.action-left, .action-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-icon {
  font-size: 14px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-primary);
}

.btn-secondary:hover {
  background: var(--bg-color-tertiary);
}

.btn-outline {
  background: transparent;
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-color-secondary);
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 14px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-color-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-primary);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-color-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.form-group input[type="text"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 6px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 14px;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  cursor: pointer;
}

.checkbox-group .hint {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color-primary);
}

/* Import modal styles */
.import-modal {
  max-width: 550px;
}

.import-tabs {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--bg-color-secondary);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.file-upload-area {
  position: relative;
  border: 2px dashed var(--border-color-primary);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  transition: all 0.2s;
  margin-top: 8px;
}

.file-upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.05);
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-color-secondary);
}

.file-icon {
  font-size: 32px;
}

.file-hint {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.file-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-color-primary);
}

.file-count {
  padding: 2px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.clear-file-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.clear-file-btn:hover {
  color: #e74c3c;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 0 !important;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

/* Status styles */
:deep(.type-username) {
  color: #e67e22;
}

:deep(.type-comment) {
  color: #1abc9c;
}

:deep(.type-bio) {
  color: #9b59b6;
}

:deep(.status-yes) {
  color: #4caf50;
}

:deep(.status-no) {
  color: #95a5a6;
}

:deep(.status-enabled) {
  color: #4caf50;
}

:deep(.status-disabled) {
  color: #e74c3c;
}
</style>
