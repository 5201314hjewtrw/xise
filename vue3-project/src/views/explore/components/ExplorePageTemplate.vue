<script setup>
import WaterfallFlow from '@/components/WaterfallFlow.vue'
import FloatingBtn from './FloatingBtn.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
    category: {
        type: [String, Number],
        default: 'general'
    },
    forceType: {
        type: Number,
        default: null
    }
})

const refreshKey = ref(0)
const isImgOnly = ref(false)

// 计算实际的type值：forceType优先，否则根据isImgOnly决定
const effectiveType = computed(() => {
    if (props.forceType !== null) {
        return props.forceType
    }
    return isImgOnly.value ? 1 : null
})

function handleReload() {
    // 通知父组件显示加载动画
    window.dispatchEvent(new CustomEvent('floating-btn-reload-request'))
}

function handleToggleImgOnly(imgOnlyState) {
    isImgOnly.value = imgOnlyState
    // 切换状态时刷新内容
    refreshKey.value++
}

function handleFloatingBtnReload() {
    // 刷新按钮触发时更新内容
    refreshKey.value++
    
    // 触发强制重新检查图片加载事件
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('force-recheck'))
    }, 100)
}

onMounted(() => {
    // 只监听刷新按钮事件
    window.addEventListener('floating-btn-reload', handleFloatingBtnReload)
})

onUnmounted(() => {
    window.removeEventListener('floating-btn-reload', handleFloatingBtnReload)
})
</script>

<template>
    <div class="explore-page">
        <WaterfallFlow :refresh-key="refreshKey" :category="category" :type="effectiveType" />
        <FloatingBtn @reload="handleReload" @toggle-img-only="handleToggleImgOnly" :hideImgOnlyButton="forceType !== null" />
    </div>
</template>

<style scoped>
.explore-page {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>