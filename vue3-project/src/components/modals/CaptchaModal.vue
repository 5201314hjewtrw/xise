<template>
  <div v-if="show" class="captcha-modal-overlay" @click="$emit('close')">
    <div class="captcha-modal" @click.stop>
      <div class="modal-header">
        <h4>请输入验证码</h4>
        <button class="close-btn" @click="$emit('close')">
          <SvgIcon name="close" width="20" height="20" />
        </button>
      </div>
      <div class="captcha-content">
        <div class="captcha-image-wrapper" @click="$emit('refresh')" :class="{ 'clickable': !isLoading }"
          title="点击刷新验证码">
          <div v-if="isLoading" class="captcha-loading">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
          <div v-else-if="captchaSvg" class="captcha-image" v-html="captchaSvg"></div>
          <div v-else class="captcha-error">验证码加载失败，点击重试</div>
        </div>

        <div class="captcha-inputs">
          <div v-for="(char, index) in captchaInputs" :key="index" 
            class="captcha-input-box"
            :class="{ 'active': activeIndex === index }">
            {{ char }}
          </div>
        </div>

        <!-- 自定义键盘 -->
        <div class="custom-keyboard">
          <div class="keyboard-row">
            <button v-for="key in keyboardRowLetters1" :key="key" 
              class="keyboard-key" 
              @click="handleKeyboardInput(key)">
              {{ key }}
            </button>
          </div>
          <div class="keyboard-row">
            <button v-for="key in keyboardRowLetters2" :key="key" 
              class="keyboard-key" 
              @click="handleKeyboardInput(key)">
              {{ key }}
            </button>
          </div>
          <div class="keyboard-row">
            <button v-for="key in keyboardRowLetters3" :key="key" 
              class="keyboard-key" 
              @click="handleKeyboardInput(key)">
              {{ key }}
            </button>
          </div>
          <div class="keyboard-row">
            <button v-for="key in keyboardRowNumbers" :key="key" 
              class="keyboard-key" 
              @click="handleKeyboardInput(key)">
              {{ key }}
            </button>
            <button class="keyboard-key keyboard-key-delete" @click="handleKeyboardDelete">
              <SvgIcon name="delete" width="18" height="18" />
            </button>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-outline" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="$emit('confirm')" :disabled="!captchaText.trim()">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, toRefs, watch, nextTick } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'



const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  captchaSvg: {
    type: String,
    default: ''
  },
  captchaText: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'refresh', 'confirm', 'update:captchaText'])

const { captchaText } = toRefs(props)
const captchaInputs = ref(['', '', '', ''])
const activeIndex = ref(0)

// 键盘布局 - 排除容易混淆的字符（与后端一致：0o1ilcIC）
const keyboardRowLetters1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'P']
const keyboardRowLetters2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
const keyboardRowLetters3 = ['Z', 'X', 'V', 'B', 'N', 'M']
const keyboardRowNumbers = ['2', '3', '4', '5', '6', '7', '8', '9']

// 监听show变化，在模态框显示时清空输入
watch(() => props.show, (newValue) => {
  if (newValue) {
    // 清空所有输入框
    captchaInputs.value = ['', '', '', '']
    activeIndex.value = 0
  }
})

// 监听验证码刷新，清空输入框
watch(() => props.captchaSvg, () => {
  // 清空所有输入框
  captchaInputs.value = ['', '', '', '']
  activeIndex.value = 0
  // 更新验证码文本
  emit('update:captchaText', '')
})

// 处理自定义键盘输入
const handleKeyboardInput = (key) => {
  if (activeIndex.value >= 4) return
  
  captchaInputs.value[activeIndex.value] = key
  
  // 更新完整的验证码
  const fullCode = captchaInputs.value.join('')
  emit('update:captchaText', fullCode)
  
  // 移动到下一个位置
  if (activeIndex.value < 3) {
    activeIndex.value++
  }
}

// 处理删除键
const handleKeyboardDelete = () => {
  if (activeIndex.value > 0 && !captchaInputs.value[activeIndex.value]) {
    // 当前位置为空，回退到上一个位置并删除
    activeIndex.value--
  }
  
  // 清空当前位置
  captchaInputs.value[activeIndex.value] = ''
  
  // 更新完整的验证码
  const fullCode = captchaInputs.value.join('')
  emit('update:captchaText', fullCode)
}
</script>

<style scoped>
.captcha-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  background: rgba(43, 43, 43, 0.5);
}

.captcha-modal {
  background: var(--bg-color-primary);
  border-radius: 16px;
  width: 320px;
  max-width: 95vw;
  overflow: hidden;
  border: 1px solid var(--border-color-primary);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-primary);
  flex-shrink: 0;
  background: var(--bg-color-primary);
}

.modal-header h4 {
  margin: 0;
  color: var(--text-color-primary);
}

.close-btn {
  width: 30px;
  height: 30px;
  background: var(--bg-color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: var(--text-color-primary);
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: var(--text-color-secondary);
  transform: scale(1.1);
  transition: all 0.2s ease;
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.captcha-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}


.captcha-image-container {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
}

.captcha-loading,
.captcha-image,
.captcha-error {
  width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-secondary);
}

.captcha-loading {
  flex-direction: row;
  gap: 8px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color-secondary);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.captcha-image {
  cursor: pointer;
  transition: opacity 0.2s ease;
  overflow: hidden;
}

.captcha-image:hover {
  opacity: 0.8;
}

.captcha-error {
  color: var(--primary-color);
  font-size: 14px;
}


.captcha-image-wrapper.clickable {
  cursor: pointer;
  margin-bottom: 20px;
}

.captcha-image-wrapper.clickable:hover {
  border-color: var(--primary-color);
  background: var(--bg-color-tertiary);
}




.captcha-inputs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.captcha-input-box {
  width: 40px;
  height: 40px;
  border: 1.5px solid var(--border-color-primary);
  border-radius: 5px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  transition: all 0.2s ease;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-input-box.active {
  border-color: var(--primary-color);
  background: var(--bg-color-secondary);
}

/* 自定义键盘样式 */
.custom-keyboard {
  width: 100%;
  padding: 8px 4px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-bottom: 4px;
}

.keyboard-row:last-child {
  margin-bottom: 0;
}

.keyboard-key {
  min-width: 28px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.keyboard-key:hover {
  background: var(--bg-color-tertiary);
}

.keyboard-key:active {
  transform: scale(0.95);
  background: var(--primary-color);
  color: white;
}

.keyboard-key-delete {
  min-width: 42px;
  background: var(--bg-color-tertiary);
  color: var(--text-color-secondary);
}

.keyboard-key-delete:hover {
  background: var(--primary-color);
  color: white;
}





/* 底部按钮居中（核心调整：justify-content从flex-end改为center） */
.form-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

/* 按钮样式保持不变 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  text-decoration: none;
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
  background-color: var(--primary-color-dark);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--bg-color-secondary);
}
</style>
