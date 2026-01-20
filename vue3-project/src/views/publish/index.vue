<template>
  <div class="publish-container">
    <div class="publish-header">
      <div class="header-left">
        <h1 class="page-title">发布笔记</h1>
      </div>
      <div class="header-right">
        <button class="draft-box-btn" @click="goToDraftBox">
          <SvgIcon name="draft" width="20" height="20" color="white" />
          <span>草稿箱</span>
        </button>
        <button class="manage-btn" @click="goToPostManagement">
          <SvgIcon name="post" width="20" height="20" />
          <span>笔记管理</span>
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
        <div class="upload-section">
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

          <!-- 上传组件 -->
          <div class="upload-content">
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

        <div class="input-section">
          <input v-model="form.title" type="text" class="title-input" placeholder="请输入标题" maxlength="100"
            @input="validateForm" />
          <div class="char-count">{{ form.title.length }}/100</div>
        </div>

        <div class="input-section">
          <div class="content-input-wrapper">
            <ContentEditableInput ref="contentTextarea" v-model="form.content" :input-class="'content-textarea'"
              placeholder="请输入内容" :enable-mention="true" :mention-users="mentionUsers" @focus="handleContentFocus"
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
          <div class="char-count">{{ form.content.length }}/2000</div>

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

          <!-- 付费设置按钮 -->
          <div class="payment-settings-section">
            <button type="button" class="payment-settings-btn" :class="{ active: form.paymentSettings.enabled }" @click="openPaymentModal">
              <span class="payment-icon">🍒</span>
              <span class="payment-text">
                <template v-if="form.paymentSettings.enabled">
                  已设置付费：{{ form.paymentSettings.price }} 石榴点
                </template>
                <template v-else>
                  设置付费内容
                </template>
              </span>
              <SvgIcon name="right" width="16" height="16" class="payment-arrow" />
            </button>
          </div>

          <!-- 可见性设置 -->
          <VisibilitySelector v-model="form.visibility" />

          <div v-if="showEmojiPanel" class="emoji-panel-overlay" v-click-outside="closeEmojiPanel">
            <div class="emoji-panel" @click.stop>
              <EmojiPicker @select="handleEmojiSelect" />
            </div>
          </div>

          <MentionModal :visible="showMentionPanel" @close="closeMentionPanel" @select="handleMentionSelect" />
        </div>

        <div class="tag-section">
          <div class="section-title">标签 (最多10个)</div>
          <TagSelector v-model="form.tags" :max-tags="10" />
        </div>
      </form>

      <div v-if="isLoggedIn" class="publish-actions">
        <button class="draft-btn" :disabled="!canSaveDraft || isSavingDraft" @click="handleSaveDraft">
          {{ isSavingDraft ? '保存中...' : '存草稿' }}
        </button>
        <button class="publish-btn" :disabled="!canPublish || isPublishing" @click="handlePublish">
          {{ isPublishing ? '发布中...' : '发布' }}
        </button>
      </div>
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
import { useScrollLock } from '@/composables/useScrollLock'
import { hasMentions, cleanMentions } from '@/utils/mentionParser'

import MultiImageUpload from '@/components/MultiImageUpload.vue'
import VideoUpload from '@/components/VideoUpload.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import TagSelector from '@/components/TagSelector.vue'
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

const form = reactive({
  title: '',
  content: '',
  images: [],
  video: null,
  tags: [],
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

// 提及用户数据（实际使用中应该从 API 获取）
const mentionUsers = ref([])

const canPublish = computed(() => {
  // 检查必填字段：标题、内容
  if (!form.title.trim() || !form.content.trim()) {
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
  // 检查是否是编辑草稿模式
  const draftId = route.query.draftId
  const mode = route.query.mode

  if (draftId && mode === 'edit') {
    await loadDraftData(draftId)
  }
})

onUnmounted(() => {
})

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
/* ============================================
   Modern Publish Page Design
   ============================================ */

.publish-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-color-secondary) 0%, var(--bg-color-primary) 100%);
  color: var(--text-color-primary);
  padding-bottom: calc(48px + constant(safe-area-inset-bottom));
  padding-bottom: calc(48px + env(safe-area-inset-bottom));
  margin: 72px auto;
  min-width: 720px;
  max-width: 720px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================
   Header Section - Modern Glass Effect
   ============================================ */
.publish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: var(--bg-color-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color-primary);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 24px -4px var(--shadow-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-color-primary);
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.draft-box-btn,
.manage-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px var(--primary-color-shadow);
}

.draft-box-btn:hover,
.manage-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-color-shadow);
}

.draft-box-btn:active,
.manage-btn:active {
  transform: translateY(0);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* ============================================
   Main Content Area
   ============================================ */
.publish-content {
  padding: 1.5rem;
  max-width: 640px;
  margin: 0 auto;
  background-color: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ============================================
   Upload Section - Card Style
   ============================================ */
.upload-section {
  background: var(--bg-color-primary);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 4px 24px -4px var(--shadow-color);
  border: 1px solid var(--border-color-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.upload-section:hover {
  box-shadow: 0 8px 32px -4px var(--shadow-color);
}

/* Modern Pill-Style Tabs */
.upload-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 0.375rem;
  background: var(--bg-color-secondary);
  border-radius: 14px;
  border: none;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  position: relative;
}

.tab-btn:hover {
  color: var(--text-color-primary);
  background: var(--bg-color-tertiary);
}

.tab-btn.active {
  color: white;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  box-shadow: 0 4px 12px var(--primary-color-shadow);
}

.upload-content {
  margin-bottom: 0;
}

.text-image-section {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-start;
}

.text-image-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: var(--button-text-color);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px var(--primary-color-shadow);
}

.text-image-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--primary-color-shadow);
}

.text-image-btn:active {
  transform: translateY(0);
}

/* ============================================
   Input Section - Modern Card Style
   ============================================ */
.input-section {
  position: relative;
  background: var(--bg-color-primary);
  border-radius: 20px;
  padding: 1.25rem;
  box-shadow: 0 4px 24px -4px var(--shadow-color);
  border: 1px solid var(--border-color-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-section:hover {
  box-shadow: 0 8px 32px -4px var(--shadow-color);
}

.input-section:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 8px 32px -4px var(--shadow-color), 0 0 0 3px var(--primary-color-shadow);
}

.title-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid var(--border-color-primary);
  border-radius: 14px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  font-size: 1.125rem;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.title-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
  box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

.title-input::placeholder {
  color: var(--text-color-tertiary);
  font-weight: 500;
}

.content-input-wrapper {
  position: relative;
  border: 2px solid var(--border-color-primary);
  border-radius: 14px;
  background: var(--bg-color-secondary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.content-input-wrapper:focus-within {
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
  box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

.content-textarea {
  width: 100%;
  padding: 1rem;
  padding-bottom: 3.5rem;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--text-color-primary);
  font-size: 1rem;
  line-height: 1.6;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 140px;
  box-sizing: border-box;
  caret-color: var(--primary-color);
}

.content-textarea:focus {
  outline: none;
}

.content-textarea:empty:before {
  content: attr(placeholder);
  color: var(--text-color-tertiary);
  pointer-events: none;
}

/* Content Action Buttons */
.content-actions {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  background: var(--bg-color-tertiary);
  border-radius: 12px;
}

.emoji-btn,
.mention-btn,
.attachment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-color-primary);
  color: var(--text-color-secondary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.emoji-btn:hover,
.mention-btn:hover,
.attachment-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.05);
}

.emoji-icon,
.mention-icon,
.attachment-icon {
  width: 20px;
  height: 20px;
}

.char-count {
  position: absolute;
  bottom: 0.75rem;
  right: 1rem;
  font-size: 0.8rem;
  color: var(--text-color-tertiary);
  background: var(--bg-color-tertiary);
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ============================================
   Attachment Preview - Modern Style
   ============================================ */
.attachment-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  margin-top: 1rem;
  background: var(--bg-color-secondary);
  border-radius: 12px;
  border: 2px solid var(--border-color-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.attachment-preview:hover {
  border-color: var(--primary-color);
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color-secondary);
  overflow: hidden;
}

.attachment-name {
  font-size: 0.875rem;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  font-weight: 500;
}

.attachment-size {
  font-size: 0.75rem;
  color: var(--text-color-tertiary);
}

.remove-attachment-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-color-tertiary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-color-tertiary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.remove-attachment-btn:hover {
  background: var(--danger-color);
  color: white;
  transform: scale(1.05);
}

/* ============================================
   Payment Settings Button - Modern Style
   ============================================ */
.payment-settings-section {
  margin-top: 1rem;
}

.payment-settings-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.25rem;
  background: var(--bg-color-secondary);
  border: 2px solid var(--border-color-primary);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-color-secondary);
}

.payment-settings-btn:hover {
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px var(--shadow-color);
}

.payment-settings-btn.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(255, 36, 66, 0.08) 0%, rgba(179, 31, 53, 0.05) 100%);
  color: var(--primary-color);
}

.payment-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.payment-text {
  flex: 1;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
}

.payment-arrow {
  color: var(--text-color-tertiary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.payment-settings-btn:hover .payment-arrow {
  transform: translateX(4px);
}

.payment-settings-btn.active .payment-arrow {
  color: var(--primary-color);
}

/* ============================================
   Tag Section - Card Style
   ============================================ */
.tag-section {
  background: var(--bg-color-primary);
  border-radius: 20px;
  padding: 1.25rem;
  box-shadow: 0 4px 24px -4px var(--shadow-color);
  border: 1px solid var(--border-color-primary);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-section:hover {
  box-shadow: 0 8px 32px -4px var(--shadow-color);
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  border-radius: 2px;
}

/* ============================================
   Emoji Panel - Modern Glass Style
   ============================================ */
.emoji-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.25s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.emoji-panel {
  background: var(--bg-color-primary);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 90vw;
  max-height: 80vh;
  border: 1px solid var(--border-color-primary);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ============================================
   Publish Actions - Modern Button Style
   ============================================ */
.publish-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1.5rem;
  margin-top: 1.5rem;
  background: var(--bg-color-primary);
  border-radius: 20px;
  box-shadow: 0 4px 24px -4px var(--shadow-color);
  border: 1px solid var(--border-color-primary);
}

.draft-btn {
  flex: 1;
  max-width: 180px;
  padding: 1rem 1.5rem;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  border: 2px solid var(--border-color-primary);
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.draft-btn:hover:not(:disabled) {
  border-color: var(--text-color-secondary);
  background: var(--bg-color-tertiary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px var(--shadow-color);
}

.draft-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.publish-btn {
  flex: 1;
  max-width: 180px;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px var(--primary-color-shadow);
}

.publish-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px var(--primary-color-shadow);
}

.publish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================
   Login Prompt - Modern Card Style
   ============================================ */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--bg-color-primary);
  border-radius: 24px;
  box-shadow: 0 8px 32px -4px var(--shadow-color);
  border: 1px solid var(--border-color-primary);
  margin: 1rem;
}

.prompt-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prompt-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 1.5rem;
  opacity: 0.6;
}

.prompt-content h3 {
  color: var(--text-color-primary);
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
}

.prompt-content p {
  color: var(--text-color-secondary);
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
}

/* ============================================
   Tag Related Styles (preserved for TagSelector)
   ============================================ */
.tag-input-wrapper {
  border: 2px solid var(--border-color-primary);
  border-radius: 14px;
  background: var(--bg-color-secondary);
  padding: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: var(--button-text-color);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  animation: tagAppear 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px var(--primary-color-shadow);
}

@keyframes tagAppear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.remove-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  line-height: 1;
}

.remove-tag-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.tag-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tag-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-color-primary);
  font-size: 0.9rem;
  outline: none;
  padding: 0.25rem 0;
  min-width: 80px;
}

.tag-input:disabled {
  background-color: var(--disabled-bg);
  cursor: not-allowed;
}

.tag-input::placeholder {
  color: var(--text-color-tertiary);
}

.add-tag-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-tag-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--primary-color-shadow);
}

.tag-suggestions,
.recommended-tags {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-color-secondary);
  border-radius: 14px;
  border: 1px solid var(--border-color-primary);
}

.suggestions-title,
.recommendations-title {
  font-size: 0.8rem;
  color: var(--text-color-tertiary);
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.suggestions-list,
.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-suggestion,
.tag-item {
  padding: 0.5rem 1rem;
  border: 2px solid var(--border-color-primary);
  border-radius: 20px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-suggestion:hover,
.tag-item:hover {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
  transform: translateY(-1px);
}

.tag-item.active {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
  color: white;
  border-color: var(--primary-color);
}

/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 960px) {
  .publish-container {
    min-width: 100%;
    max-width: 100%;
    margin: 72px 0;
    background: var(--bg-color-primary);
  }

  .publish-header {
    padding: 1rem 1.25rem;
    border-radius: 0;
  }

  .header-right {
    gap: 0.5rem;
  }

  .draft-box-btn,
  .manage-btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }

  .publish-content {
    padding: 1rem;
  }

  .upload-section,
  .input-section,
  .tag-section,
  .publish-actions {
    border-radius: 16px;
  }

  .publish-actions {
    padding: 1.25rem 1rem;
  }
}

@media (max-width: 480px) {
  .publish-header {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.15rem;
  }

  .header-actions {
    gap: 0.5rem;
  }

  .draft-box-btn,
  .manage-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }

  .publish-content {
    padding: 0.75rem;
  }

  .upload-section,
  .input-section,
  .tag-section {
    padding: 1rem;
    border-radius: 14px;
  }

  .tab-btn {
    padding: 0.625rem 0.75rem;
    font-size: 0.85rem;
  }

  .title-input {
    font-size: 1rem;
    padding: 0.75rem 1rem;
  }

  .tag-input {
    min-width: 60px;
    font-size: 0.85rem;
  }

  .publish-actions {
    padding: 1rem;
    gap: 0.75rem;
    flex-direction: column;
  }

  .draft-btn,
  .publish-btn {
    width: 100%;
    max-width: none;
    padding: 0.875rem;
    font-size: 0.95rem;
  }
}
</style>