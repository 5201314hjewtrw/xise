<template>
  <div class="publish-container">
    <!-- 现代化头部 -->
    <header class="publish-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">✨</span>
          创作笔记
        </h1>
        <div class="header-actions">
          <button class="header-btn secondary" @click="goToDraftBox">
            <SvgIcon name="draft" width="18" height="18" />
            <span>草稿箱</span>
          </button>
          <button class="header-btn secondary" @click="goToPostManagement">
            <SvgIcon name="post" width="18" height="18" />
            <span>笔记管理</span>
          </button>
        </div>
      </div>
    </header>

    <main class="publish-main">
      <!-- 登录提示 -->
      <div class="login-prompt" v-if="!isLoggedIn">
        <div class="prompt-card">
          <div class="prompt-icon-wrapper">
            <SvgIcon name="post" width="48" height="48" class="prompt-icon" />
          </div>
          <h3>请先登录</h3>
          <p>登录后即可发布和管理笔记</p>
        </div>
      </div>

      <div v-if="isLoggedIn" class="publish-layout">
        <!-- 左侧：媒体上传区域 -->
        <section class="media-section">
          <div class="section-card">
            <!-- 媒体类型切换 -->
            <div class="media-tabs">
              <button 
                type="button" 
                class="media-tab" 
                :class="{ active: uploadType === 'image' }"
                @click="switchUploadType('image')"
              >
                <SvgIcon name="image" width="18" height="18" />
                <span>图文</span>
              </button>
              <button 
                type="button" 
                class="media-tab" 
                :class="{ active: uploadType === 'video' }"
                @click="switchUploadType('video')"
              >
                <SvgIcon name="play" width="18" height="18" />
                <span>视频</span>
              </button>
            </div>

            <!-- 上传区域 -->
            <div class="upload-area">
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

            <!-- 文字配图按钮 -->
            <div v-if="uploadType === 'image'" class="media-tools">
              <button type="button" class="tool-btn" @click="openTextImageModal">
                <SvgIcon name="magic" width="16" height="16" />
                <span>AI 配图</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 右侧：内容编辑区域 -->
        <section class="content-section">
          <form @submit.prevent="handlePublish" class="publish-form">
            <!-- 标题输入（可选） -->
            <div class="form-group title-group">
              <div class="input-wrapper">
                <input 
                  v-model="form.title" 
                  type="text" 
                  class="title-input" 
                  placeholder="添加标题（可选）" 
                  maxlength="100"
                />
                <span class="char-indicator">{{ form.title.length }}/100</span>
              </div>
            </div>

            <!-- 内容输入 -->
            <div class="form-group content-group">
              <div class="content-wrapper">
                <ContentEditableInput 
                  ref="contentTextarea" 
                  v-model="form.content" 
                  :input-class="'content-editor'"
                  placeholder="分享你的想法..." 
                  :enable-mention="true" 
                  :mention-users="mentionUsers" 
                  @focus="handleContentFocus"
                  @blur="handleContentBlur" 
                  @keydown="handleInputKeydown" 
                  @mention="handleMentionInput" 
                />
                <div class="content-footer">
                  <div class="content-tools">
                    <button type="button" class="icon-btn" @click="toggleMentionPanel" title="@好友">
                      <SvgIcon name="mention" width="20" height="20" />
                    </button>
                    <button type="button" class="icon-btn" @click="toggleEmojiPanel" title="表情">
                      <SvgIcon name="emoji" width="20" height="20" />
                    </button>
                    <button type="button" class="icon-btn" @click="openAttachmentModal" title="附件">
                      <SvgIcon name="attachment" width="20" height="20" />
                    </button>
                  </div>
                  <span class="char-indicator">{{ form.content.length }}/2000</span>
                </div>
              </div>

              <!-- 附件预览 -->
              <div v-if="form.attachment" class="attachment-chip">
                <SvgIcon name="attachment" width="14" height="14" />
                <span class="chip-text">{{ form.attachment.name }}</span>
                <span class="chip-size">{{ formatAttachmentSize(form.attachment.size) }}</span>
                <button type="button" class="chip-remove" @click="removeAttachment">
                  <SvgIcon name="close" width="12" height="12" />
                </button>
              </div>
            </div>

            <!-- 设置区域 -->
            <div class="settings-group">
              <!-- 付费设置 -->
              <button 
                type="button" 
                class="setting-btn" 
                :class="{ active: form.paymentSettings.enabled }" 
                @click="openPaymentModal"
              >
                <span class="setting-icon">🍒</span>
                <span class="setting-label">
                  <template v-if="form.paymentSettings.enabled">
                    已设置付费 · {{ form.paymentSettings.price }} 石榴点
                  </template>
                  <template v-else>
                    设置付费内容
                  </template>
                </span>
                <SvgIcon name="right" width="16" height="16" class="setting-arrow" />
              </button>

              <!-- 可见性设置 -->
              <VisibilitySelector v-model="form.visibility" />
            </div>

            <!-- 标签选择 -->
            <div class="form-group tags-group">
              <div class="tags-header">
                <span class="tags-label">添加标签</span>
                <span class="tags-hint">最多10个</span>
              </div>
              <TagSelector v-model="form.tags" :max-tags="10" />
            </div>

            <!-- 发布按钮 -->
            <div class="action-buttons">
              <button 
                type="button" 
                class="action-btn secondary" 
                :disabled="!canSaveDraft || isSavingDraft" 
                @click="handleSaveDraft"
              >
                {{ isSavingDraft ? '保存中...' : '存草稿' }}
              </button>
              <button 
                type="submit" 
                class="action-btn primary" 
                :disabled="!canPublish || isPublishing"
              >
                {{ isPublishing ? '发布中...' : '发布笔记' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <!-- 表情面板 -->
      <div v-if="showEmojiPanel" class="emoji-overlay" v-click-outside="closeEmojiPanel">
        <div class="emoji-picker-wrapper" @click.stop>
          <EmojiPicker @select="handleEmojiSelect" />
        </div>
      </div>

      <MentionModal :visible="showMentionPanel" @close="closeMentionPanel" @select="handleMentionSelect" />
    </main>

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
  // 检查必填字段：只需要内容（标题可选）
  if (!form.content.trim()) {
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

  
  // 验证必填字段（标题可选，只需要内容）
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
/* 现代化设计系统 */
.publish-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-color-secondary) 0%, var(--bg-color-primary) 100%);
  color: var(--text-color-primary);
}

/* 头部样式 */
.publish-header {
  position: sticky;
  top: 60px;
  z-index: 100;
  background: rgba(var(--bg-color-primary-rgb, 255, 255, 255), 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color-primary);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.header-btn.secondary {
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.header-btn.secondary:hover {
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  border-color: var(--primary-color);
}

/* 主内容区 */
.publish-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* 登录提示 */
.login-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.prompt-card {
  text-align: center;
  padding: 3rem;
  background: var(--bg-color-primary);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.prompt-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  border-radius: 50%;
  margin-bottom: 1.5rem;
}

.prompt-icon {
  color: white;
}

.prompt-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 0.5rem;
}

.prompt-card p {
  color: var(--text-color-secondary);
  margin: 0;
}

/* 两栏布局 */
.publish-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

/* 区块卡片 */
.section-card {
  background: var(--bg-color-primary);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--border-color-primary);
}

/* 媒体区域 */
.media-section {
  position: sticky;
  top: 140px;
}

.media-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 4px;
  background: var(--bg-color-secondary);
  border-radius: 12px;
}

.media-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.media-tab:hover {
  color: var(--text-color-primary);
}

.media-tab.active {
  background: var(--bg-color-primary);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.upload-area {
  min-height: 200px;
}

.media-tools {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-primary);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
}

/* 内容区域 */
.content-section {
  background: var(--bg-color-primary);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--border-color-primary);
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  position: relative;
}

/* 标题输入 */
.title-group .input-wrapper {
  position: relative;
}

.title-input {
  width: 100%;
  padding: 1rem;
  padding-right: 4rem;
  border: 2px solid var(--border-color-primary);
  border-radius: 12px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  font-size: 1.125rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.title-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
}

.title-input::placeholder {
  color: var(--text-color-tertiary);
  font-weight: 400;
}

.char-indicator {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-color-tertiary);
}

/* 内容输入 */
.content-wrapper {
  border: 2px solid var(--border-color-primary);
  border-radius: 12px;
  background: var(--bg-color-secondary);
  transition: all 0.2s ease;
  overflow: hidden;
}

.content-wrapper:focus-within {
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
}

.content-editor {
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: none;
  background: transparent;
  color: var(--text-color-primary);
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
}

.content-editor:focus {
  outline: none;
}

.content-editor:empty:before {
  content: attr(placeholder);
  color: var(--text-color-tertiary);
}

.content-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
}

.content-tools {
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-color-tertiary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--primary-color);
}

.content-footer .char-indicator {
  position: static;
  transform: none;
}

/* 附件芯片 */
.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
  border-radius: 20px;
  font-size: 0.875rem;
}

.chip-text {
  color: var(--text-color-primary);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-size {
  color: var(--text-color-tertiary);
  font-size: 0.75rem;
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: var(--text-color-tertiary);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-remove:hover {
  background: var(--danger-color);
}

/* 设置组 */
.settings-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-color-secondary);
  border: 2px solid var(--border-color-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.setting-btn:hover {
  border-color: var(--primary-color);
}

.setting-btn.active {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.05);
}

.setting-icon {
  font-size: 1.25rem;
}

.setting-label {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.setting-btn.active .setting-label {
  color: var(--primary-color);
}

.setting-arrow {
  color: var(--text-color-tertiary);
}

/* 标签组 */
.tags-group {
  padding-top: 0.5rem;
}

.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tags-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-primary);
}

.tags-hint {
  font-size: 0.75rem;
  color: var(--text-color-tertiary);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border-color-primary);
}

.action-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
  border: 2px solid var(--border-color-primary);
}

.action-btn.secondary:hover:not(:disabled) {
  background: var(--bg-color-primary);
  border-color: var(--text-color-secondary);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--primary-color-rgb), 0.35);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* 表情面板 */
.emoji-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.emoji-picker-wrapper {
  background: var(--bg-color-primary);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: scaleIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* 响应式设计 */
@media (max-width: 960px) {
  .publish-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .media-section {
    position: static;
  }

  .header-content {
    padding: 0.75rem 1rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .header-btn span {
    display: none;
  }

  .header-btn {
    padding: 0.5rem;
  }
}

@media (max-width: 640px) {
  .publish-main {
    padding: 1rem;
  }

  .section-card,
  .content-section {
    padding: 1rem;
    border-radius: 12px;
  }

  .title-input {
    font-size: 1rem;
    padding: 0.875rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-btn {
    padding: 0.875rem;
  }
}
</style>