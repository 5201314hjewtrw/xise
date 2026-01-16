<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ExplorePageTemplate from './components/ExplorePageTemplate.vue'

const route = useRoute()

// 根据路由参数或路由名称获取频道类型
const channelType = computed(() => {
    if (route.params.channel) {
        return route.params.channel
    }
    return route.name || 'recommend'
})

// 频道配置映射（categories removed, only recommend is available）
const channelConfig = computed(() => {
    return {
        'recommend': { category: 'recommend', title: '推荐' }
    }
})

// 获取当前频道配置
const currentChannel = computed(() => {
    return channelConfig.value[channelType.value] || channelConfig.value['recommend']
})
</script>

<template>
    <ExplorePageTemplate :category="currentChannel.category" />
</template>
