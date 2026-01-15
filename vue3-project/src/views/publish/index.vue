<template>
  <div class="publish-container">
    <!-- 新布局：顶部导航栏 -->
    <div class="publish-header">
      <div class="header-back" @click="handleBack">←</div>
      <div class="header-title">发布笔记</div>
      <div class="header-actions">
        <button class="header-action-btn" @click="goToDraftBox" title="草稿箱">
          <SvgIcon name="draft" width="20" height="20" />
        </button>
        <button class="header-action-btn" @click="goToPostManagement" title="笔记管理">
          <SvgIcon name="post" width="20" height="20" />
        </button>
      </div>
    </div>

    <div class="publish-content">
      <!-- 登录提示 -->
      <div class="login-prompt" v-if="!isLoggedIn">
        <div class="prompt-content">
          <SvgIcon name="post" width="48" height="48" class="prompt-icon" />
          <h3>请先登录</h3>
          <p>登录后即可发布和管理笔记</p>
        </div>
      </div>

      <form v-if="isLoggedIn" @submit.prevent="handlePublish" class="publish-form">
        <!-- 媒体上传区域 -->
        <div class="media-section">
          <!-- Tab选项 -->
          <div class="upload-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: uploadType === 'image' }"
              @click="switchUploadType('image')"
            >
              上传图文
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: uploadType === 'video' }"
              @click="switchUploadType('video')"
            >
              上传视频
            </button>
          </div>

          <!-- 媒体预览区域 -->
          <div class="media-area">
            <MultiImageUpload 
              v-if="uploadType === 'image'"
              ref="multiImageUploadRef" 
              v-model="form.images" 
              :max-images="9" 
              :allow-delete-last="true"
              :payment-enabled="form.paymentSettings.enabled"
              @error="handleUploadError" 
            />
            <VideoUpload 
              v-if="uploadType === 'video'"
              ref="videoUploadRef"
              v-model="form.video"
              @error="handleUploadError"
            />
          </div>

          <div v-if="uploadType === 'image'" class="text-image-section">
            <button type="button" class="text-image-btn" @click="openTextImageModal">
              <SvgIcon name="magic" width="16" height="16" />
              <span>文字配图</span>
            </button>
          </div>
        </div>

        <!-- 标题输入 -->
        <div class="input-section title-section">
          <input v-model="form.title" type="text" class="title-input" placeholder="添加标题" maxlength="100"
            @input="validateForm" />
        </div>

        <!-- 内容输入 -->
        <div class="input-section content-section">
          <div class="content-input-wrapper">
            <ContentEditableInput ref="contentTextarea" v-model="form.content" :input-class="'content-textarea'"
              placeholder="分享你的生活、穿搭、好物、使用心得...

越真实越打动人～" :enable-mention="true" :mention-users="mentionUsers" @focus="handleContentFocus"
              @blur="handleContentBlur" @keydown="handleInputKeydown" @mention="handleMentionInput" />
            <div class="content-actions">
              <button type="button" class="mention-btn" @click="toggleMentionPanel">
                <SvgIcon name="mention" class="mention-icon" width="20" height="20" />
              </button>
              <button type="button" class="emoji-btn" @click="toggleEmojiPanel">
                <SvgIcon name="emoji" class="emoji-icon" width="20" height="20" />
              </button>
              <button type="button" class="attachment-btn" @click="openAttachmentModal">
                <SvgIcon name="attachment" class="attachment-icon" width="20" height="20" />
              </button>
            </div>
          </div>
          <!-- 附件预览 -->
          <div v-if="form.attachment" class="attachment-preview">
            <div class="attachment-info">
              <SvgIcon name="attachment" width="16" height="16" />
              <span class="attachment-name">{{ form.attachment.name }}</span>
              <span class="attachment-size">({{ formatAttachmentSize(form.attachment.size) }})</span>
            </div>
            <button type="button" class="remove-attachment-btn" @click="removeAttachment">
              <SvgIcon name="close" width="14" height="14" />
            </button>
          </div>

          <div v-if="showEmojiPanel" class="emoji-panel-overlay" v-click-outside="closeEmojiPanel">
            <div class="emoji-panel" @click.stop>
              <EmojiPicker @select="handleEmojiSelect" />
            </div>
          </div>

          <MentionModal :visible="showMentionPanel" @close="closeMentionPanel" @select="handleMentionSelect" />
        </div>

        <!-- 标签区域 -->
        <div class="tags-section">
          <TagSelector v-model="form.tags" :max-tags="10" />
        </div>

        <!-- 选项列表区域 -->
        <div class="options-section">
          <!-- 分类选项 -->
          <div class="option-item" @click="showCategoryDropdown = !showCategoryDropdown">
            <span class="option-label"># 分类</span>
            <div class="option-value">
              <span v-if="selectedCategoryName">{{ selectedCategoryName }}</span>
              <span v-else class="placeholder">请选择</span>
              <span class="arrow">›</span>
            </div>
          </div>
          <div v-if="showCategoryDropdown" class="category-dropdown">
            <DropdownSelect v-model="form.category_id" :options="categories" placeholder="请选择分类" label-key="name"
              value-key="id" max-width="100%" min-width="100%" @change="handleCategoryChange" />
          </div>

          <!-- 付费设置选项 -->
          <div class="option-item" @click="openPaymentModal">
            <span class="option-label">🍒 付费设置</span>
            <div class="option-value">
              <span v-if="form.paymentSettings.enabled" class="active-text">{{ form.paymentSettings.price }} 石榴点</span>
              <span v-else class="placeholder">未设置</span>
              <span class="arrow">›</span>
            </div>
          </div>

          <!-- 可见性设置选项 -->
          <div class="option-item visibility-option">
            <span class="option-label">👁 可见范围</span>
            <VisibilitySelector v-model="form.visibility" />
          </div>
        </div>
      </form>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="isLoggedIn" class="actions-bar">
      <button class="btn btn-draft" :disabled="!canSaveDraft || isSavingDraft" @click="handleSaveDraft">
        {{ isSavingDraft ? '保存中...' : '存草稿' }}
      </button>
      <button class="btn btn-publish" :disabled="!canPublish || isPublishing" @click="handlePublish">
        {{ isPublishing ? '发布中...' : '发布笔记' }}
      </button>
    </div>

    <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />

    <!-- 文字配图模态框 -->
    <TextImageModal :visible="showTextImageModal" @close="closeTextImageModal" @generate="handleTextImageGenerate" />

    <!-- 附件上传模态框 -->
    <AttachmentUploadModal 
      v-model:visible="showAttachmentModal" 
      :modelValue="form.attachment"
      @update:modelValue="form.attachment = $event"
      @confirm="handleAttachmentConfirm"
      @close="closeAttachmentModal"
    />

    <!-- 付费设置模态框 -->
    <PaymentSettingsModal
      v-model:visible="showPaymentModal"
      v-model="form.paymentSettings"
      :mediaCount="mediaCount"
      :mediaType="uploadType"
      :freeImagesCount="freeImagesCount"
      :paidImagesCount="paidImagesCount"
      @confirm="handlePaymentConfirm"
      @close="closePaymentModal"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import { createPost, getPostDetail, updatePost, deletePost } from '@/api/posts'
import { getCategories } from '@/api/categories'
import { useScrollLock } from '@/composables/useScrollLock'
import { hasMentions, cleanMentions } from '@/utils/mentionParser'

import MultiImageUpload from '@/components/MultiImageUpload.vue'
import VideoUpload from '@/components/VideoUpload.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import TagSelector from '@/components/TagSelector.vue'
import DropdownSelect from '@/components/DropdownSelect.vue'
import MessageToast from '@/components/MessageToast.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import MentionModal from '@/components/mention/MentionModal.vue'
import ContentEditableInput from '@/components/ContentEditableInput.vue'
import TextImageModal from '@/views/publish/components/TextImageModal.vue'
import AttachmentUploadModal from '@/components/AttachmentUploadModal.vue'
import PaymentSettingsModal from '@/components/PaymentSettingsModal.vue'
import VisibilitySelector from '@/components/VisibilitySelector.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const authStore = useAuthStore()
const navigationStore = useNavigationStore()
const { lock, unlock } = useScrollLock()

const multiImageUploadRef = ref(null)
const videoUploadRef = ref(null)
const contentTextarea = ref(null)

// 上传类型状态
const uploadType = ref('image') // 'image' 或 'video'

const isPublishing = ref(false)
const isSavingDraft = ref(false)
const showEmojiPanel = ref(false)
const showMentionPanel = ref(false)
const isContentFocused = ref(false)
const showTextImageModal = ref(false)
const showAttachmentModal = ref(false)
const showPaymentModal = ref(false)

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')
const showCategoryDropdown = ref(false)

const form = reactive({
  title: '',
  content: '',
  images: [],
  video: null,
  tags: [],
  category_id: null,
  attachment: null,
  visibility: 'public',
  paymentSettings: {
    enabled: false,
    paymentType: 'single',
    price: 0,
    freePreviewCount: 0,
    previewDuration: 0,
    hideAll: false
  }
})

// 草稿相关状态
const currentDraftId = ref(null)
const isEditMode = ref(false)

const categories = ref([])

// 提及用户数据（实际使用中应该从 API 获取）
const mentionUsers = ref([])

const canPublish = computed(() => {
  // 检查必填字段：标题、内容、分类
  if (!form.title.trim() || !form.content.trim() || !form.category_id) {
    return false
  }
  
  if (uploadType.value === 'image') {
    // 检查图片上传组件是否有待上传的图片
    if (!multiImageUploadRef.value) return false
    return multiImageUploadRef.value.getImageCount() > 0
  } else if (uploadType.value === 'video') {
    // 检查视频组件是否有待上传的视频
    if (!videoUploadRef.value) return false
    const videoData = videoUploadRef.value.getVideoData()
    return videoData && (videoData.uploaded || videoData.file)
  }
  
  return false
})

const canSaveDraft = computed(() => {
  // 草稿保存条件：有标题或内容，并且有媒体文件
  const hasContent = form.title.trim() || form.content.trim()
  
  if (!hasContent) return false
  
  if (uploadType.value === 'image') {
    // 检查图片上传组件是否有待上传的图片
    if (!multiImageUploadRef.value) return false
    return multiImageUploadRef.value.getImageCount() > 0
  } else if (uploadType.value === 'video') {
    // 检查视频组件是否有待上传的视频
    if (!videoUploadRef.value) return false
    const videoData = videoUploadRef.value.getVideoData()
    return videoData && (videoData.uploaded || videoData.file)
  }
  
  return false
})

// 登录状态检查
const isLoggedIn = computed(() => userStore.isLoggedIn)

// 选中分类名称
const selectedCategoryName = computed(() => {
  if (!form.category_id || categories.value.length === 0) return ''
  const category = categories.value.find(cat => cat.id === form.category_id)
  return category ? category.name : ''
})

// 媒体数量计算
const mediaCount = computed(() => {
  if (uploadType.value === 'image') {
    if (multiImageUploadRef.value) {
      return multiImageUploadRef.value.getImageCount()
    }
    return form.images.length
  } else if (uploadType.value === 'video') {
    if (videoUploadRef.value) {
      const videoData = videoUploadRef.value.getVideoData()
      return videoData && (videoData.uploaded || videoData.file) ? 1 : 0
    }
    return form.video ? 1 : 0
  }
  return 0
})

// 免费预览图片数量
const freeImagesCount = computed(() => {
  if (uploadType.value === 'image' && form.images && form.images.length > 0) {
    return form.images.filter(img => img.isFreePreview).length
  }
  return 0
})

// 付费图片数量
const paidImagesCount = computed(() => {
  if (uploadType.value === 'image' && form.images && form.images.length > 0) {
    return form.images.filter(img => !img.isFreePreview).length
  }
  return 0
})

// 打开登录模态框
const openLoginModal = () => {
  authStore.openLoginModal()
}

onMounted(async () => {
  navigationStore.scrollToTop('instant')
  // 先加载分类列表，确保分类数据可用
  await loadCategories()
  // 检查是否是编辑草稿模式
  const draftId = route.query.draftId
  const mode = route.query.mode

  if (draftId && mode === 'edit') {
    await loadDraftData(draftId)
  }
})

onUnmounted(() => {
})

const loadCategories = async () => {
  try {
    const response = await getCategories()
    if (response.success && response.data) {
      categories.value = response.data.map(category => ({
        id: category.id,
        name: category.name
      }))
    }
  } catch (error) {
    console.error('加载分类失败:', error)
    showMessage('加载分类失败', 'error')
  }
}

const validateForm = () => {
  return true
}

const showMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const handleToastClose = () => {
  showToast.value = false
}

const handleBack = () => {
  router.back()
}

// 跳转到笔记管理页面
const goToPostManagement = () => {
  router.push('/post-management')
}

// 跳转到草稿箱页面
const goToDraftBox = () => {
  router.push('/draft-box')
}

const handleUploadError = (error) => {
  showMessage(error, 'error')
}

// 切换上传类型
const switchUploadType = (type) => {
  if (uploadType.value === type) return
  
  uploadType.value = type
  
  // 切换时清空对应的数据
  if (type === 'image') {
    form.video = ''
    if (videoUploadRef.value) {
      videoUploadRef.value.reset()
    }
  } else {
    form.images = []
    if (multiImageUploadRef.value) {
      multiImageUploadRef.value.reset()
    }
  }
}

const openTextImageModal = () => {
  showTextImageModal.value = true
  lock()
}

const closeTextImageModal = () => {
  showTextImageModal.value = false
  unlock()
}

const handleTextImageGenerate = async (data) => {

  
  // 将生成的图片添加到MultiImageUpload组件
  const imageComponent = multiImageUploadRef.value
  if (imageComponent && data.imageFile) {
    try {
      // 使用addFiles方法添加图片文件
      await imageComponent.addFiles([data.imageFile])
      showMessage('文字配图生成成功！', 'success')
    } catch (error) {
      console.error('添加图片失败:', error)
      showMessage('添加图片失败，请重试', 'error')
    }
  } else {
    showMessage('图片生成失败，请重试', 'error')
  }
  
  closeTextImageModal()
}

// 附件相关函数
const openAttachmentModal = () => {
  showAttachmentModal.value = true
  lock()
}

const closeAttachmentModal = () => {
  showAttachmentModal.value = false
  unlock()
}

const handleAttachmentConfirm = (attachmentData) => {
  form.attachment = attachmentData
  closeAttachmentModal()
}

const removeAttachment = () => {
  form.attachment = null
}

// 付费设置相关函数
const openPaymentModal = () => {
  showPaymentModal.value = true
  lock()
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  unlock()
}

const handlePaymentConfirm = (paymentData) => {
  form.paymentSettings = paymentData
  closePaymentModal()
}

const formatAttachmentSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleCategoryChange = (data) => {
  form.category_id = data.value
}

const handleContentFocus = () => {
  isContentFocused.value = true
}

const handleContentBlur = () => {
  setTimeout(() => {
    isContentFocused.value = false
  }, 100)
}

const toggleEmojiPanel = () => {
  if (showEmojiPanel.value) {
    closeEmojiPanel()
  } else {
    showEmojiPanel.value = true
    lock()
  }
}

const closeEmojiPanel = () => {
  showEmojiPanel.value = false
  unlock()
}

const toggleMentionPanel = () => {
  // 如果要打开面板，先插入@符号
  if (!showMentionPanel.value && contentTextarea.value && contentTextarea.value.insertAtSymbol) {
    contentTextarea.value.insertAtSymbol()
  }
  showMentionPanel.value = !showMentionPanel.value
}

const closeMentionPanel = () => {
  showMentionPanel.value = false
  unlock()
}

// 处理@符号输入事件
const handleMentionInput = () => {
  // 当用户输入@符号时，自动打开mention面板
  if (!showMentionPanel.value) {
    showMentionPanel.value = true
  }
}

// 处理表情选择
const handleEmojiSelect = (emoji) => {
  const emojiChar = emoji.i
  const inputElement = contentTextarea.value

  if (inputElement && inputElement.insertEmoji) {
    // 使用ContentEditableInput组件的insertEmoji方法
    inputElement.insertEmoji(emojiChar)
  } else {
    // 备用方案：直接添加到末尾
    form.content += emojiChar
    nextTick(() => {
      if (inputElement) {
        inputElement.focus()
      }
    })
  }

  closeEmojiPanel()
}

// 处理好友选择
const handleMentionSelect = (friend) => {
  // 调用ContentEditableInput组件的selectMentionUser方法
  if (contentTextarea.value && contentTextarea.value.selectMentionUser) {
    contentTextarea.value.selectMentionUser(friend)
  }

  // 关闭mention面板
  closeMentionPanel()
}

// 处理键盘事件，实现mention标签整体删除
const handleInputKeydown = (event) => {
  if (event.key === 'Backspace') {
    const selection = window.getSelection()
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)

      // 如果没有选中内容且光标在mention链接后面
      if (range.collapsed) {
        const container = range.startContainer
        const offset = range.startOffset

        // 检查光标前面的节点是否是mention链接
        let prevNode = null
        if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          prevNode = container.previousSibling
        } else if (container.nodeType === Node.ELEMENT_NODE && offset > 0) {
          prevNode = container.childNodes[offset - 1]
        }

        // 如果前面的节点是mention链接，删除整个链接
        if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE &&
          prevNode.classList && prevNode.classList.contains('mention-link')) {
          event.preventDefault()
          prevNode.remove()

          // 更新form.content
          form.content = event.target.textContent || ''
          return
        }
      }
    }
  }
}



const handlePublish = async () => {

  
  // 验证必填字段
  if (!form.title.trim()) {
    showMessage('请输入标题', 'error')
    return
  }

  if (!form.content.trim()) {
    showMessage('请输入内容', 'error')
    return
  }

  if (!form.category_id) {
    showMessage('请选择分类', 'error')
    return
  }

  // 根据上传类型验证媒体文件
  if (uploadType.value === 'image') {
    if (!multiImageUploadRef.value || multiImageUploadRef.value.getImageCount() === 0) {
      showMessage('请至少上传一张图片', 'error')
      return
    }
  } else if (uploadType.value === 'video') {
    if (!videoUploadRef.value) {
      showMessage('请选择视频文件', 'error')
      return
    }
    
    const videoData = videoUploadRef.value.getVideoData()
    if (!videoData || (!videoData.uploaded && !videoData.file)) {
      showMessage('请选择视频文件', 'error')
      return
    }
  }

  isPublishing.value = true

  try {
    let mediaData = []
    
    if (uploadType.value === 'image') {
      const imageComponent = multiImageUploadRef.value
      if (!imageComponent) {
        showMessage('图片组件未初始化', 'error')
        return
      }

      // 处理图片上传
      if (imageComponent.getImageCount() > 0) {
        showMessage('正在上传图片...', 'info')
        const uploadedImages = await imageComponent.uploadAllImages()

        if (uploadedImages.length === 0) {
          showMessage('图片上传失败', 'error')
          return
        }

        mediaData = uploadedImages
      }
    } else {
      // 视频上传处理

      const videoComponent = videoUploadRef.value
      if (!videoComponent) {
        console.error('❌ 视频组件未初始化')
        showMessage('视频组件未初始化', 'error')
        return
      }

      // 检查是否有视频文件需要上传
      const videoData = videoComponent.getVideoData()

      
      if (videoData && videoData.file && !videoData.uploaded) {

        showMessage('正在上传视频...', 'info')
        
        try {
          const uploadResult = await videoComponent.startUpload()

          
          if (uploadResult && uploadResult.success) {
            mediaData = {
              url: uploadResult.data.url,
              coverUrl: uploadResult.data.coverUrl,
              name: uploadResult.data.originalname || videoData.name,
              size: uploadResult.data.size || videoData.size
            }

          } else {
            console.error('❌ 视频上传失败:', uploadResult)
            showMessage('视频上传失败: ' + (uploadResult?.message || '未知错误'), 'error')
            return
          }
        } catch (error) {
          console.error('❌ 视频上传异常:', error)
          showMessage('视频上传失败', 'error')
          return
        }
      } else if (videoData && videoData.url) {
        // 已经上传过的视频

        mediaData = {
          url: videoData.url,
          coverUrl: videoData.coverUrl,
          name: videoData.name,
          size: videoData.size
        }

      } else {
        console.error('❌ 视频数据异常:', videoData)
        showMessage('视频数据异常', 'error')
        return
      }
    }

    const postData = {
      title: form.title.trim(),
      content: form.content,
      images: uploadType.value === 'image' ? mediaData : [],
      video: uploadType.value === 'video' ? mediaData : null,
      tags: form.tags,
      category_id: form.category_id,
      type: uploadType.value === 'image' ? 1 : 2, // 1: 图文, 2: 视频
      is_draft: false, // 发布状态
      attachment: form.attachment || null,
      visibility: form.visibility || 'public',
      paymentSettings: form.paymentSettings.enabled ? form.paymentSettings : null
    }




    showMessage('正在发布笔记...', 'info')




    let response
    if (isEditMode.value && currentDraftId.value) {

      response = await updatePost(currentDraftId.value, postData)
    } else {
      // 普通发布

      response = await createPost(postData)
    }



    if (response.success) {
      showMessage('发布成功！', 'success')
      resetForm()

      setTimeout(() => {
        router.push('/post-management')
      }, 1500)
    } else {
      showMessage(response.message || '发布失败', 'error')
    }
  } catch (err) {
    console.error('发布失败:', err)
    showMessage('发布失败，请重试', 'error')
  } finally {
    isPublishing.value = false
  }
}


// 重置表单
const resetForm = () => {
  form.title = ''
  form.content = ''
  form.images = []
  form.video = null
  form.tags = []
  form.category_id = null
  form.attachment = null
  form.visibility = 'public'
  form.paymentSettings = {
    enabled: false,
    paymentType: 'single',
    price: 0,
    freePreviewCount: 0,
    previewDuration: 0,
    hideAll: false
  }
  
  if (multiImageUploadRef.value) {
    multiImageUploadRef.value.reset()
  }
  if (videoUploadRef.value) {
    videoUploadRef.value.reset()
  }
}

// 加载草稿数据
const loadDraftData = async (draftId) => {
  try {
    const response = await getPostDetail(draftId)
    if (response && response.originalData) {
      const fullData = response
      const draft = response.originalData
      // 初始化表单数据
      form.title = response.title || ''
      form.content = draft.content || ''
      form.images = draft.images || []
      
      // 设置视频数据 - 从fullData中获取视频信息
      if (fullData.video_url) {
        // 构造完整的视频对象，包含VideoUpload组件需要的所有字段
        form.video = {
          url: fullData.video_url,
          coverUrl: fullData.cover_url,
          uploaded: true,
          name: '已上传的视频',
          size: 0,
          preview: fullData.video_url  // 添加preview字段，VideoUpload组件需要这个字段来显示video-success状态
        }
      } else {
        form.video = draft.video || null
      }

      // 设置附件数据
      if (fullData.attachment) {
        form.attachment = fullData.attachment
      } else {
        form.attachment = null
      }

      // 设置付费设置数据
      if (fullData.paymentSettings) {
        form.paymentSettings = fullData.paymentSettings
      } else {
        form.paymentSettings = {
          enabled: false,
          paymentType: 'single',
          price: 0,
          freePreviewCount: 0,
          previewDuration: 0,
          hideAll: false
        }
      }

      // 设置可见性数据
      form.visibility = fullData.visibility || 'public'

      // 处理标签数据：确保转换为字符串数组
      if (draft.tags && Array.isArray(draft.tags)) {
        form.tags = draft.tags.map(tag => {
          // 如果是对象格式，提取name字段
          if (typeof tag === 'object' && tag.name) {
            return tag.name
          }
          // 如果已经是字符串，直接返回
          return String(tag)
        })
      } else {
        form.tags = []
      }

      // 根据分类名称找到分类ID
      if (response.category && categories.value.length > 0) {
        const categoryItem = categories.value.find(cat => cat.name === response.category)
        form.category_id = categoryItem ? categoryItem.id : null
      } else {
        form.category_id = null
      }

      // 根据草稿数据类型设置uploadType
      if (fullData.type === 2 || (form.video && form.video.url)) {
        uploadType.value = 'video'
      } else if (form.images.length > 0 || fullData.type === 1) {
        // type: 1 表示图文类型，或者有图片数据
        uploadType.value = 'image'
      }
      

      // 设置编辑模式
      currentDraftId.value = draftId
      isEditMode.value = true

      // 等待DOM更新
      await nextTick()
      // 初始化图片组件
      if (uploadType.value === 'image' && form.images.length > 0 && multiImageUploadRef.value) {
        // 传递完整的图片数据（包含isFreePreview属性）
        multiImageUploadRef.value.syncWithUrls(form.images)
      }

      // 初始化视频组件
      if (uploadType.value === 'video' && form.video) {
        await nextTick()
        const videoData = form.video
        form.video = null // 先清空
        await nextTick()
        form.video = videoData // 再设置，确保触发watch
      }

      showMessage('草稿加载成功', 'success')
    } else {
      showMessage('草稿不存在或已被删除', 'error')
      router.push('/draft-box')
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
    showMessage('加载草稿失败', 'error')
    router.push('/draft-box')
  }
}

const handleSaveDraft = async () => {
  // 验证是否有内容可以保存
  if (!form.title.trim() && !form.content.trim()) {
    showMessage('请输入标题或内容', 'error')
    return
  }

  // 验证是否有媒体文件
  if (uploadType.value === 'image') {
    if (!multiImageUploadRef.value || multiImageUploadRef.value.getImageCount() === 0) {
      showMessage('请至少上传一张图片', 'error')
      return
    }
  } else if (uploadType.value === 'video') {
    if (!videoUploadRef.value) {
      showMessage('请选择视频文件', 'error')
      return
    }
    
    const videoData = videoUploadRef.value.getVideoData()
    if (!videoData || (!videoData.uploaded && !videoData.file)) {
      showMessage('请选择视频文件', 'error')
      return
    }
  }

  isSavingDraft.value = true

  try {
    let mediaData = []
    
    if (uploadType.value === 'image') {
      // 如果有图片，先上传图片
      const imageComponent = multiImageUploadRef.value
      if (imageComponent && imageComponent.getImageCount() > 0) {
        showMessage('正在上传图片...', 'info')
        const uploadedImages = await imageComponent.uploadAllImages()
        mediaData = uploadedImages
      }
    } else if (uploadType.value === 'video') {
      // 视频上传处理
      const videoComponent = videoUploadRef.value
      if (videoComponent) {
        const videoData = videoComponent.getVideoData()
        if (videoData && videoData.file && !videoData.uploaded) {
          showMessage('正在上传视频...', 'info')
          
          try {
            const uploadResult = await videoComponent.startUpload()
            if (uploadResult && uploadResult.success) {
              mediaData = {
                url: uploadResult.data.url,
                coverUrl: uploadResult.data.coverUrl,
                name: uploadResult.data.originalname || videoData.name,
                size: uploadResult.data.size || videoData.size
              }
            } else {
              showMessage('视频上传失败: ' + (uploadResult?.message || '未知错误'), 'error')
              return
            }
          } catch (error) {
            console.error('视频上传失败:', error)
            showMessage('视频上传失败', 'error')
            return
          }
        } else if (videoData && videoData.url) {
          // 已经上传过的视频
          mediaData = {
            url: videoData.url,
            coverUrl: videoData.coverUrl,
            name: videoData.name,
            size: videoData.size
          }
        }
      }
    }

    const draftData = {
      title: form.title.trim() || '',
      content: form.content || '',
      images: uploadType.value === 'image' ? mediaData : [],
      video: uploadType.value === 'video' ? mediaData : null,
      tags: form.tags || [],
      category_id: form.category_id || null,
      type: uploadType.value === 'image' ? 1 : 2, // 1: 图文, 2: 视频
      is_draft: true,
      attachment: form.attachment || null,
      visibility: form.visibility || 'public',
      paymentSettings: form.paymentSettings.enabled ? form.paymentSettings : null
    }

    showMessage('正在保存草稿...', 'info')

    let response
    if (isEditMode.value && currentDraftId.value) {
      // 更新现有草稿
      response = await updatePost(currentDraftId.value, draftData)
    } else {
      // 创建新草稿
      response = await createPost(draftData)
      if (response.success && response.data) {
        currentDraftId.value = response.data.id
        isEditMode.value = true
      }
    }

    if (response.success) {
      showMessage('草稿保存成功！', 'success')

      // 清空表单
      resetForm()

      // 跳转到草稿箱页面
      setTimeout(() => {
        router.push('/draft-box')
      }, 1500)
    } else {
      showMessage(response.message || '草稿保存失败', 'error')
    }
  } catch (err) {
    console.error('草稿保存失败:', err)
    showMessage('草稿保存失败，请重试', 'error')
  } finally {
    isSavingDraft.value = false
  }
}
</script>

<style scoped>
/* ===== 基础容器 ===== */
.publish-container {
  min-height: 100vh;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  padding-bottom: 80px; /* 给底部按钮留空间 */
  max-width: 1080px;
  margin: 0 auto;
  padding-left: 16px;
  padding-right: 16px;
  transition: background-color 0.2s ease;
}

/* PC端适配 */
@media (min-width: 768px) {
  .publish-container {
    padding-left: 32px;
    padding-right: 32px;
  }
}

/* ===== 顶部导航栏 ===== */
.publish-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-color-primary);
  font-size: 18px;
  margin: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-color-primary);
}

.header-back {
  font-size: 28px;
  cursor: pointer;
  padding: 8px;
  transition: opacity 0.2s;
}

.header-back:hover {
  opacity: 0.7;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--text-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-action-btn:hover {
  background: var(--bg-color-secondary);
}

/* ===== 内容区域 ===== */
.publish-content {
  padding: 0;
  background-color: var(--bg-color-primary);
  transition: background-color 0.2s ease;
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ===== 媒体上传区域 ===== */
.media-section {
  margin-bottom: 24px;
}

.upload-tabs {
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color-primary);
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  position: relative;
}

.tab-btn:hover {
  color: var(--text-color-primary);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.media-area {
  margin-bottom: 16px;
}

.text-image-section {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.text-image-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.text-image-btn:hover {
  background: var(--primary-color-dark);
}

/* ===== 标题输入 ===== */
.title-section {
  margin-bottom: 16px;
}

.title-input {
  width: 100%;
  font-size: 24px;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--text-color-primary);
  padding: 10px 0 14px;
  outline: none;
  border-bottom: 1px solid var(--border-color-primary);
  transition: border-color 0.2s ease;
}

.title-input:focus {
  border-bottom-color: var(--primary-color);
}

.title-input::placeholder {
  color: var(--text-color-quaternary);
}

@media (min-width: 768px) {
  .title-input {
    font-size: 28px;
    padding: 12px 0 16px;
  }
}

/* ===== 内容输入 ===== */
.content-section {
  margin-bottom: 24px;
}

.content-input-wrapper {
  position: relative;
  border: none;
  border-radius: 0;
  background: transparent;
}

.content-textarea {
  width: 100%;
  font-size: 16px;
  line-height: 1.6;
  min-height: 160px;
  background: transparent;
  border: none;
  color: var(--text-color-secondary);
  resize: vertical;
  outline: none;
  padding: 0;
  padding-bottom: 48px;
  caret-color: var(--primary-color);
}

.content-textarea:empty:before {
  content: attr(placeholder);
  color: var(--text-color-quaternary);
  pointer-events: none;
  white-space: pre-wrap;
}

@media (min-width: 768px) {
  .content-textarea {
    font-size: 18px;
    line-height: 1.7;
    min-height: 180px;
  }
}

.content-actions {
  position: absolute;
  bottom: 8px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.emoji-btn,
.mention-btn,
.attachment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-color-tertiary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emoji-btn:hover,
.mention-btn:hover,
.attachment-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
}

/* ===== 附件预览 ===== */
.attachment-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-top: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color-primary);
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-secondary);
  overflow: hidden;
}

.attachment-name {
  font-size: 13px;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.attachment-size {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.remove-attachment-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-color-tertiary);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-attachment-btn:hover {
  background: var(--danger-color);
  color: white;
}

/* ===== 标签区域 ===== */
.tags-section {
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .tags-section {
    margin-bottom: 40px;
  }
}

/* ===== 选项列表 ===== */
.options-section {
  margin-bottom: 24px;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--border-color-primary);
  font-size: 16px;
  color: var(--text-color-primary);
  cursor: pointer;
  transition: background 0.2s ease;
}

.option-item:hover {
  background: var(--bg-color-secondary);
  margin: 0 -16px;
  padding: 18px 16px;
}

@media (min-width: 768px) {
  .option-item {
    font-size: 17px;
    padding: 20px 0;
  }
  
  .option-item:hover {
    margin: 0 -32px;
    padding: 20px 32px;
  }
}

.option-label {
  font-weight: 500;
}

.option-value {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-tertiary);
}

.option-value .placeholder {
  color: var(--text-color-quaternary);
}

.option-value .active-text {
  color: var(--primary-color);
}

.arrow {
  color: var(--text-color-quaternary);
  font-size: 22px;
  font-weight: 300;
}

.visibility-option {
  cursor: default;
}

.visibility-option:hover {
  background: transparent;
  margin: 0;
  padding: 18px 0;
}

@media (min-width: 768px) {
  .visibility-option:hover {
    padding: 20px 0;
  }
}

.category-dropdown {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color-primary);
}

/* ===== 底部操作栏 ===== */
.actions-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-color-primary);
  border-top: 1px solid var(--border-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 0 20px;
  z-index: 10;
}

@media (min-width: 768px) {
  .actions-bar {
    justify-content: flex-end;
    padding: 0 40px;
    max-width: 1080px;
    margin: 0 auto;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
}

.btn {
  height: 46px;
  line-height: 46px;
  padding: 0 32px;
  border-radius: 23px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-draft {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-primary);
}

.btn-draft:hover:not(:disabled) {
  background: var(--bg-color-tertiary);
}

.btn-publish {
  background: linear-gradient(to right, #fe2c55, #ff385c);
  color: white;
}

.btn-publish:hover:not(:disabled) {
  opacity: 0.9;
}

/* ===== 表情面板 ===== */
.emoji-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.emoji-panel {
  background: var(--bg-color-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: scaleIn 0.2s ease;
  max-width: 90vw;
  max-height: 80vh;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ===== 登录提示 ===== */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.prompt-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prompt-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 16px;
}

.prompt-content h3 {
  color: var(--text-color-primary);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.prompt-content p {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

/* ===== 响应式适配 ===== */
@media (max-width: 768px) {
  .publish-container {
    padding-bottom: 80px;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .btn {
    padding: 0 24px;
    font-size: 14px;
  }
  
  .actions-bar {
    gap: 16px;
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  .title-input {
    font-size: 20px;
  }
  
  .content-textarea {
    font-size: 15px;
    min-height: 120px;
  }
  
  .option-item {
    padding: 14px 0;
    font-size: 15px;
  }
  
  .btn {
    height: 40px;
    line-height: 40px;
    padding: 0 20px;
    font-size: 14px;
  }
}
</style>