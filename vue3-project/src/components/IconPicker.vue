<template>
  <div class="icon-picker">
    <div class="icon-picker-trigger" @click="togglePicker">
      <div class="selected-icon" v-if="modelValue">
        <SvgIcon :name="modelValue" width="20" height="20" />
        <span class="icon-name">{{ modelValue }}</span>
      </div>
      <span class="placeholder" v-else>{{ placeholder }}</span>
      <SvgIcon name="down" width="14" height="14" class="dropdown-arrow" :class="{ rotated: showPicker }" />
    </div>
    
    <div v-if="showPicker" class="icon-picker-dropdown" v-click-outside.mousedown="closePicker">
      <div class="icon-search">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索图标..."
          class="search-input"
        />
      </div>
      <div class="icon-grid">
        <div 
          v-for="icon in filteredIcons" 
          :key="icon"
          class="icon-item"
          :class="{ selected: modelValue === icon }"
          @click="selectIcon(icon)"
          :title="icon"
        >
          <SvgIcon :name="icon" width="24" height="24" />
          <span class="icon-label">{{ icon }}</span>
        </div>
      </div>
      <div v-if="filteredIcons.length === 0" class="no-results">
        没有找到匹配的图标
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择图标'
  }
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const searchQuery = ref('')

// 所有可用的图标列表
const availableIcons = [
  'admin', 'alert', 'arrowTop', 'attachment', 'category', 'chat', 'clear', 'clock',
  'close', 'coin', 'collect', 'collected', 'data', 'delete', 'down', 'download',
  'draft', 'edit', 'emoji', 'female', 'filter', 'follow', 'fullscreen-exit', 'fullscreen',
  'hash', 'history', 'home', 'image', 'imgNote', 'imgNoteSelect', 'info', 'left',
  'leftArrow', 'like', 'liked', 'loading', 'logout', 'magic', 'male', 'mention',
  'menu', 'monitor', 'moon', 'notification', 'overified', 'passed', 'pause', 'play',
  'post', 'publish', 'pverified', 'reload', 'right', 'search', 'setting', 'share',
  'sun', 'tick', 'unpassed', 'user', 'verified', 'view', 'volume-mute', 'volume', 'warning'
]

const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return availableIcons
  }
  const query = searchQuery.value.toLowerCase()
  return availableIcons.filter(icon => icon.toLowerCase().includes(query))
})

const togglePicker = () => {
  showPicker.value = !showPicker.value
  if (showPicker.value) {
    searchQuery.value = ''
  }
}

const closePicker = () => {
  showPicker.value = false
}

const selectIcon = (icon) => {
  emit('update:modelValue', icon)
  showPicker.value = false
}
</script>

<style scoped>
.icon-picker {
  position: relative;
  width: 100%;
}

.icon-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 4px;
  background: var(--bg-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-picker-trigger:hover {
  border-color: var(--primary-color);
}

.selected-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-primary);
}

.icon-name {
  font-size: 14px;
}

.placeholder {
  color: var(--text-color-tertiary);
  font-size: 14px;
}

.dropdown-arrow {
  color: var(--text-color-secondary);
  transition: transform 0.2s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

.icon-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.icon-search {
  padding: 8px;
  border-bottom: 1px solid var(--border-color-primary);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  max-height: 240px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 4px;
}

.icon-item:hover {
  background: var(--bg-color-secondary);
}

.icon-item.selected {
  background: var(--primary-color);
  color: white;
}

.icon-item.selected :deep(svg) {
  color: white;
}

.icon-label {
  font-size: 10px;
  color: var(--text-color-secondary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.icon-item.selected .icon-label {
  color: white;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: var(--text-color-tertiary);
  font-size: 14px;
}

/* 滚动条样式 */
.icon-grid::-webkit-scrollbar {
  width: 6px;
}

.icon-grid::-webkit-scrollbar-track {
  background: var(--bg-color-secondary);
  border-radius: 3px;
}

.icon-grid::-webkit-scrollbar-thumb {
  background: var(--border-color-primary);
  border-radius: 3px;
}

.icon-grid::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-quaternary);
}
</style>
