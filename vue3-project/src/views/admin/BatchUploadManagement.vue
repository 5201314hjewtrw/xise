<template>
  <div class="batch-upload-management">
    <div class="batch-upload-header">
      <h2>批量上传笔记</h2>
      <p class="description">每张图片或每个视频将创建为一条独立的笔记</p>
    </div>

    <div class="batch-upload-form">
      <div class="form-section">
        <label class="form-label">作者ID <span class="required">*</span></label>
        <input v-model.number="formData.user_id" type="number" class="form-input"
          placeholder="请输入用户ID" />
      </div>

      <div class="form-section">
        <label class="form-label">笔记类型 <span class="required">*</span></label>
        <div class="type-selector">
          <button :class="['type-btn', { active: formData.type === 1 }]" @click="formData.type = 1">
            <SvgIcon name="post" width="20" height="20" />
            图文笔记
          </button>
          <button :class="['type-btn', { active: formData.type === 2 }]" @click="formData.type = 2">
            <SvgIcon name="video" width="20" height="20" />
            视频笔记
          </button>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">标签（可选，将应用到所有笔记）</label>
        <TagSelector v-model="formData.tags" :max-tags="10" />
      </div>

      <div class="form-section" v-if="formData.type === 1">
        <label class="form-label">批量上传图片 <span class="required">*</span></label>
        <div class="batch-upload-area" @click="triggerImageInput" @dragover.prevent @drop.prevent="handleImageDrop">
          <input ref="imageInputRef" type="file" accept="image/*" multiple @change="handleImageSelect"
            style="display: none" />
          <SvgIcon name="publish" width="40" height="40" />
          <p>点击或拖拽上传多张图片</p>
          <p class="upload-hint">每张图片将创建一条笔记，支持JPG、PNG、GIF、WebP格式</p>
        </div>
        <div v-if="pendingImages.length > 0" class="pending-files">
          <div class="pending-header">
            <span>待上传图片（{{ pendingImages.length }}张，将创建{{ pendingImages.length }}条笔记）</span>
            <button class="btn-clear" @click="clearPendingImages">清空</button>
          </div>
          <div class="pending-list">
            <div v-for="(img, index) in pendingImages" :key="index" class="pending-item">
              <img :src="img.preview" class="pending-preview" />
              <span class="pending-name">{{ img.name }}</span>
              <button class="btn-remove" @click="removePendingImage(index)">×</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section" v-if="formData.type === 2">
        <label class="form-label">批量上传视频 <span class="required">*</span></label>
        <div class="batch-upload-area" @click="triggerVideoInput" @dragover.prevent @drop.prevent="handleVideoDrop">
          <input ref="videoInputRef" type="file" accept="video/*" multiple @change="handleVideoSelect"
            style="display: none" />
          <SvgIcon name="video" width="40" height="40" />
          <p>点击或拖拽上传多个视频</p>
          <p class="upload-hint">每个视频将创建一条笔记，支持MP4、MOV、AVI、WMV、FLV格式</p>
        </div>
        <div v-if="pendingVideos.length > 0" class="pending-files">
          <div class="pending-header">
            <span>待上传视频（{{ pendingVideos.length }}个，将创建{{ pendingVideos.length }}条笔记）</span>
            <button class="btn-clear" @click="clearPendingVideos">清空</button>
          </div>
          <div class="pending-list">
            <div v-for="(video, index) in pendingVideos" :key="index" class="pending-item">
              <div class="video-icon">
                <SvgIcon name="video" width="24" height="24" />
              </div>
              <span class="pending-name">{{ video.name }}</span>
              <span class="pending-size">{{ formatFileSize(video.size) }}</span>
              <button class="btn-remove" @click="removePendingVideo(index)">×</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label checkbox-label">
          <input type="checkbox" v-model="formData.is_draft" />
          保存为草稿
        </label>
      </div>

      <div class="form-actions">
        <button class="btn btn-outline" @click="resetForm" :disabled="isSubmitting">
          重置
        </button>
        <button class="btn btn-primary" @click="handleBatchSubmit" :disabled="!canSubmit || isSubmitting">
          {{ getSubmitButtonText() }}
        </button>
      </div>

      <!-- Progress indicator -->
      <div v-if="isSubmitting" class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <p class="progress-text">{{ progressText }}</p>
      </div>
    </div>

    <div v-if="uploadHistory.length > 0" class="upload-history">
      <h3>上传历史</h3>
      <div class="history-list">
        <div v-for="(item, index) in uploadHistory" :key="index" class="history-item"
          :class="{ success: item.success, error: !item.success }">
          <span class="history-type">{{ item.type === 1 ? '图文' : '视频' }}</span>
          <span class="history-count">{{ item.count }}条笔记</span>
          <span class="history-status">{{ item.success ? '成功' : '失败' }}</span>
          <span class="history-time">{{ formatTime(item.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import TagSelector from '@/components/TagSelector.vue'
import messageManager from '@/utils/messageManager'
import apiConfig from '@/config/api.js'

const imageInputRef = ref(null)
const videoInputRef = ref(null)

const formData = reactive({
  user_id: null,
  type: 1,
  tags: [],
  is_draft: false
})

const pendingImages = ref([])
const pendingVideos = ref([])
const isSubmitting = ref(false)
const uploadHistory = ref([])
const currentProgress = ref(0)
const totalItems = ref(0)
const progressText = ref('')

// Progress percentage
const progressPercent = computed(() => {
  if (totalItems.value === 0) return 0
  return Math.round((currentProgress.value / totalItems.value) * 100)
})

// Check if form can be submitted
const canSubmit = computed(() => {
  if (!formData.user_id) return false

  if (formData.type === 1) {
    return pendingImages.value.length > 0
  } else {
    return pendingVideos.value.length > 0
  }
})

// Get auth headers
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`
  }
  return headers
}

// Trigger file inputs
const triggerImageInput = () => {
  imageInputRef.value?.click()
}

const triggerVideoInput = () => {
  videoInputRef.value?.click()
}

// Handle image selection
const handleImageSelect = (event) => {
  const files = Array.from(event.target.files)
  addImages(files)
  event.target.value = ''
}

const handleImageDrop = (event) => {
  const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  addImages(files)
}

// Max file size: 100MB for images
const MAX_IMAGE_SIZE = 100 * 1024 * 1024

const addImages = (files) => {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    if (file.size > MAX_IMAGE_SIZE) {
      messageManager.warning(`图片 ${file.name} 超过100MB限制，已跳过`)
      continue
    }
    const preview = URL.createObjectURL(file)
    pendingImages.value.push({
      file,
      name: file.name,
      size: file.size,
      preview
    })
  }
}

const removePendingImage = (index) => {
  if (index >= 0 && index < pendingImages.value.length) {
    URL.revokeObjectURL(pendingImages.value[index].preview)
    pendingImages.value.splice(index, 1)
  }
}

const clearPendingImages = () => {
  pendingImages.value.forEach(img => URL.revokeObjectURL(img.preview))
  pendingImages.value = []
}

// Handle video selection
const handleVideoSelect = (event) => {
  const files = Array.from(event.target.files)
  addVideos(files)
  event.target.value = ''
}

const handleVideoDrop = (event) => {
  const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('video/'))
  addVideos(files)
}

// Max file size: 500MB for videos
const MAX_VIDEO_SIZE = 500 * 1024 * 1024

const addVideos = (files) => {
  for (const file of files) {
    if (!file.type.startsWith('video/')) continue
    if (file.size > MAX_VIDEO_SIZE) {
      messageManager.warning(`视频 ${file.name} 超过500MB限制，已跳过`)
      continue
    }
    pendingVideos.value.push({
      file,
      name: file.name,
      size: file.size
    })
  }
}

const removePendingVideo = (index) => {
  if (index >= 0 && index < pendingVideos.value.length) {
    pendingVideos.value.splice(index, 1)
  }
}

const clearPendingVideos = () => {
  pendingVideos.value = []
}

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Get submit button text
const getSubmitButtonText = () => {
  if (isSubmitting.value) {
    return `上传中 (${currentProgress.value}/${totalItems.value})`
  }

  if (formData.type === 1) {
    const count = pendingImages.value.length
    return count > 0 ? `上传并创建${count}条笔记` : '上传并创建笔记'
  } else {
    const count = pendingVideos.value.length
    return count > 0 ? `上传并创建${count}条笔记` : '上传并创建笔记'
  }
}

// Format time
const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
}

// Reset form
const resetForm = () => {
  formData.user_id = null
  formData.type = 1
  formData.tags = []
  formData.is_draft = false
  clearPendingImages()
  clearPendingVideos()
}

// Upload single image and get URL
const uploadSingleImage = async (file) => {
  const formDataUpload = new FormData()
  formDataUpload.append('file', file)

  const adminToken = localStorage.getItem('admin_token')
  const response = await fetch(`${apiConfig.baseURL}/upload/single`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formDataUpload
  })

  const result = await response.json()
  if (result.code === 200) {
    return result.data.url
  }
  throw new Error(result.message || '图片上传失败')
}

// Upload single video and get URL
const uploadSingleVideo = async (file) => {
  const formDataUpload = new FormData()
  formDataUpload.append('file', file)

  const adminToken = localStorage.getItem('admin_token')
  const response = await fetch(`${apiConfig.baseURL}/upload/video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formDataUpload
  })

  const result = await response.json()
  if (result.code === 200) {
    return {
      url: result.data.url,
      coverUrl: result.data.coverUrl || ''
    }
  }
  throw new Error(result.message || '视频上传失败')
}

// Create a single post
const createPost = async (postData) => {
  const response = await fetch(`${apiConfig.baseURL}/admin/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(postData)
  })

  const result = await response.json()
  if (result.code === 200) {
    return result.data
  }
  throw new Error(result.message || '创建笔记失败')
}

// Handle batch submit
const handleBatchSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true
  currentProgress.value = 0
  let successCount = 0
  let failCount = 0

  try {
    if (formData.type === 1) {
      // Batch upload images - each image becomes a separate post
      totalItems.value = pendingImages.value.length
      progressText.value = '正在批量上传图片笔记...'

      for (let i = 0; i < pendingImages.value.length; i++) {
        const img = pendingImages.value[i]
        progressText.value = `正在上传第 ${i + 1}/${pendingImages.value.length} 张图片...`

        try {
          // Upload image
          const imageUrl = await uploadSingleImage(img.file)

          // Create post with this single image
          await createPost({
            user_id: formData.user_id,
            type: 1,
            title: '',
            content: '',
            tags: formData.tags,
            is_draft: formData.is_draft,
            images: [imageUrl]
          })

          successCount++
        } catch (error) {
          console.error(`图片 ${img.name} 上传失败:`, error)
          failCount++
        }

        currentProgress.value = i + 1
      }
    } else {
      // Batch upload videos - each video becomes a separate post
      totalItems.value = pendingVideos.value.length
      progressText.value = '正在批量上传视频笔记...'

      for (let i = 0; i < pendingVideos.value.length; i++) {
        const video = pendingVideos.value[i]
        progressText.value = `正在上传第 ${i + 1}/${pendingVideos.value.length} 个视频...`

        try {
          // Upload video
          const { url, coverUrl } = await uploadSingleVideo(video.file)

          // Create post with this video
          await createPost({
            user_id: formData.user_id,
            type: 2,
            title: '',
            content: '',
            tags: formData.tags,
            is_draft: formData.is_draft,
            video_url: url,
            cover_url: coverUrl
          })

          successCount++
        } catch (error) {
          console.error(`视频 ${video.name} 上传失败:`, error)
          failCount++
        }

        currentProgress.value = i + 1
      }
    }

    // Show result
    if (failCount === 0) {
      messageManager.success(`成功创建 ${successCount} 条笔记`)
    } else {
      messageManager.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
    }

    // Add to history
    uploadHistory.value.unshift({
      type: formData.type,
      count: successCount,
      success: failCount === 0,
      time: new Date()
    })

    // Reset form
    resetForm()

  } catch (error) {
    console.error('批量上传失败:', error)
    messageManager.error('批量上传失败')

    uploadHistory.value.unshift({
      type: formData.type,
      count: 0,
      success: false,
      time: new Date()
    })
  } finally {
    isSubmitting.value = false
    progressText.value = ''
  }
}
</script>

<style scoped>
.batch-upload-management {
  padding: 20px 30px;
  max-width: 800px;
  margin: 0 auto;
}

.batch-upload-header {
  margin-bottom: 30px;
}

.batch-upload-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--text-color-primary);
}

.batch-upload-header .description {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.batch-upload-form {
  background: var(--bg-color-primary);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--border-color-primary);
}

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color-primary);
  font-size: 14px;
}

.form-label .required {
  color: var(--primary-color);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: var(--bg-color-primary);
  color: var(--text-color-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.type-selector {
  display: flex;
  gap: 12px;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-primary);
  color: var(--text-color-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.type-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

/* Batch upload area */
.batch-upload-area {
  border: 2px dashed var(--border-color-primary);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color-secondary);
}

.batch-upload-area:hover {
  border-color: var(--primary-color);
  background: var(--bg-color-secondary);
}

.batch-upload-area p {
  margin: 10px 0 0 0;
}

.upload-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--text-color-tertiary);
}

/* Pending files */
.pending-files {
  margin-top: 16px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  overflow: hidden;
}

.pending-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-color-secondary);
  border-bottom: 1px solid var(--border-color-primary);
  font-size: 14px;
  color: var(--text-color-primary);
}

.btn-clear {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  background: var(--bg-color-tertiary);
  color: var(--text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background: var(--primary-color);
  color: white;
}

.pending-list {
  max-height: 300px;
  overflow-y: auto;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color-primary);
}

.pending-item:last-child {
  border-bottom: none;
}

.pending-preview {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
}

.video-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-secondary);
  border-radius: 4px;
  color: var(--text-color-secondary);
}

.pending-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--text-color-primary);
}

.pending-size {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--bg-color-tertiary);
  color: var(--text-color-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: #f56c6c;
  color: white;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color-primary);
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-outline {
  background-color: transparent;
  color: var(--text-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--bg-color-secondary);
}

/* Upload Progress */
.upload-progress {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-color-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: var(--text-color-secondary);
  text-align: center;
}

/* Upload History */
.upload-history {
  margin-top: 30px;
  background: var(--bg-color-primary);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--border-color-primary);
}

.upload-history h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-color-primary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  font-size: 14px;
}

.history-item.success {
  border-left: 3px solid #67c23a;
}

.history-item.error {
  border-left: 3px solid #f56c6c;
}

.history-type {
  padding: 2px 8px;
  background: var(--bg-color-tertiary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.history-count {
  flex: 1;
  color: var(--text-color-primary);
}

.history-status {
  color: var(--text-color-secondary);
}

.history-time {
  color: var(--text-color-tertiary);
  font-size: 12px;
}

@media (max-width: 640px) {
  .batch-upload-management {
    padding: 16px;
  }

  .batch-upload-form {
    padding: 16px;
  }

  .type-selector {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .btn {
    width: 100%;
  }

  .history-item {
    flex-wrap: wrap;
  }

  .history-count {
    width: 100%;
    order: 1;
  }

  .history-time {
    order: 2;
  }
}
</style>
