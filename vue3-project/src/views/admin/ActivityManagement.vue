<template>
  <CrudTable 
    title="活动管理" 
    entity-name="活动" 
    api-endpoint="/admin/activities" 
    :columns="columns"
    :form-fields="formFields" 
    :search-fields="searchFields" 
  />
</template>

<script setup>
import CrudTable from '@/views/admin/components/CrudTable.vue'

// 活动状态映射
const activityStatusMap = {
  'draft': '草稿',
  'active': '进行中',
  'ended': '已结束'
}

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: '活动名称', maxLength: 30, sortable: false },
  { key: 'content', label: '活动内容', type: 'content', maxLength: 50, sortable: false },
  { key: 'reward', label: '奖励描述', maxLength: 20, sortable: false },
  { key: 'reward_amount', label: '奖励金额', sortable: false },
  { key: 'status', label: '活动状态', type: 'mapped', map: activityStatusMap, sortable: false },
  { key: 'is_active', label: '启用状态', type: 'boolean', trueText: '启用', falseText: '禁用', sortable: false },
  { key: 'tags', label: '关联标签', type: 'tags', sortable: false },
  { key: 'participant_count', label: '参与人数', sortable: false },
  { key: 'end_time', label: '截止时间', type: 'date', sortable: true },
  { key: 'created_at', label: '创建时间', type: 'date', sortable: true }
]

const formFields = [
  { key: 'name', label: '活动名称', type: 'text', required: true, placeholder: '请输入活动名称' },
  { key: 'content', label: '活动内容', type: 'textarea', required: true, placeholder: '请输入活动内容描述' },
  { key: 'reward', label: '奖励描述', type: 'text', placeholder: '请输入奖励描述（如：精选推荐、石榴点奖励等）' },
  { key: 'reward_amount', label: '奖励金额', type: 'number', placeholder: '奖励金额（石榴点）' },
  { key: 'target_likes', label: '目标点赞数', type: 'number', placeholder: '活动目标点赞数' },
  { key: 'target_comments', label: '目标评论数', type: 'number', placeholder: '活动目标评论数' },
  { key: 'target_collections', label: '目标收藏数', type: 'number', placeholder: '活动目标收藏数' },
  { key: 'target_views', label: '目标浏览数', type: 'number', placeholder: '活动目标浏览数' },
  {
    key: 'status',
    label: '活动状态',
    type: 'select',
    required: true,
    options: [
      { value: 'draft', label: '草稿' },
      { value: 'active', label: '进行中' },
      { value: 'ended', label: '已结束' }
    ]
  },
  { key: 'start_time', label: '开始时间', type: 'datetime', placeholder: '活动开始时间' },
  { key: 'end_time', label: '截止时间', type: 'datetime', required: true, placeholder: '活动截止时间' },
  { key: 'tags', label: '关联标签', type: 'tags', placeholder: '输入标签名称，用户发布内容时添加这些标签即可参与活动' },
  { key: 'images', label: '活动图片', type: 'multi-image-upload', maxImages: 1 }
]

const searchFields = [
  { key: 'name', label: '活动名称', placeholder: '搜索活动名称' },
  {
    key: 'status',
    label: '活动状态',
    type: 'select',
    placeholder: '活动状态',
    options: [
      { value: '', label: '全部状态' },
      { value: 'draft', label: '草稿' },
      { value: 'active', label: '进行中' },
      { value: 'ended', label: '已结束' }
    ]
  }
]
</script>
