<template>
  <CrudTable title="工具栏管理" entity-name="工具栏项目" api-endpoint="/admin/toolbar-items" :columns="columns" :form-fields="formFields"
    :search-fields="searchFields" default-sort-field="sort_order" default-sort-order="asc" />
</template>

<script setup>
import CrudTable from '@/views/admin/components/CrudTable.vue'

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: '工具名称', sortable: false },
  { key: 'icon', label: '图标名称', sortable: false },
  { key: 'path', label: '跳转路径', sortable: false, maxLength: 30 },
  { key: 'sort_order', label: '排序', sortable: true },
  { key: 'enabled', label: '状态', type: 'boolean', trueText: '启用', falseText: '禁用', sortable: false },
  { key: 'created_at', label: '创建时间', type: 'date', sortable: true }
]

const formFields = [
  { key: 'name', label: '工具名称', type: 'text', required: true, placeholder: '请输入工具名称' },
  { key: 'icon', label: '图标名称', type: 'text', required: true, placeholder: '请输入图标名称（如：history, edit, setting）' },
  { key: 'path', label: '跳转路径', type: 'text', required: true, placeholder: '请输入跳转路径（如：/history 或 https://example.com）' },
  { key: 'sort_order', label: '排序', type: 'number', required: false, placeholder: '数字越小越靠前，默认为0' },
  { key: 'enabled', label: '启用状态', type: 'switch', required: false }
]

const searchFields = [
  { key: 'name', label: '工具名称', placeholder: '搜索工具名称' },
  { 
    key: 'enabled', 
    label: '状态', 
    type: 'select',
    placeholder: '全部状态',
    options: [
      { label: '全部状态', value: '' },
      { label: '启用', value: 'true' },
      { label: '禁用', value: 'false' }
    ]
  }
]
</script>
