<template>
  <div class="user-management">
    <CrudTable 
      ref="crudTable"
      title="用户管理" 
      entity-name="用户" 
      api-endpoint="/admin/users" 
      :columns="columns" 
      :form-fields="formFields"
      :search-fields="searchFields" 
      :custom-actions="customActions"
      default-sort-field="id" 
      default-sort-order="asc"
      @custom-action="handleCustomAction" 
    />

    <!-- 调整余额弹窗 -->
    <div v-if="showAdjustModal" class="modal-overlay" @click="closeAdjustModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>调整用户余额</h3>
          <button class="close-btn" @click="closeAdjustModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="user-info">
            <span>用户: {{ selectedUser?.nickname || selectedUser?.user_id }}</span>
            <span>当前余额: <strong>{{ currentPoints.toFixed(2) }}</strong> 石榴点</span>
          </div>
          <div class="form-group">
            <label>调整金额</label>
            <input 
              v-model.number="adjustAmount" 
              type="number" 
              step="0.01"
              placeholder="正数增加，负数扣除"
            />
          </div>
          <div class="form-group">
            <label>调整原因</label>
            <input 
              v-model="adjustReason" 
              type="text" 
              placeholder="请输入调整原因（可选）"
            />
          </div>
          <div v-if="adjustAmount" class="preview">
            <span v-if="adjustAmount > 0" class="positive">
              将增加 {{ adjustAmount.toFixed(2) }} 石榴点，调整后余额: {{ (currentPoints + adjustAmount).toFixed(2) }}
            </span>
            <span v-else-if="adjustAmount < 0" class="negative">
              将扣除 {{ Math.abs(adjustAmount).toFixed(2) }} 石榴点，调整后余额: {{ (currentPoints + adjustAmount).toFixed(2) }}
            </span>
          </div>
          <div v-if="adjustError" class="error-message">{{ adjustError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeAdjustModal">取消</button>
          <button 
            class="btn btn-primary" 
            @click="submitAdjust"
            :disabled="!adjustAmount || adjustAmount === 0 || isSubmitting"
          >
            {{ isSubmitting ? '处理中...' : '确认调整' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CrudTable from '@/views/admin/components/CrudTable.vue'
import { adminApi } from '@/api/index.js'

const crudTable = ref(null)

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'user_id', label: '汐社号', type: 'user-link', sortable: false, maxLength: 15 },
  { key: 'nickname', label: '用户昵称', sortable: false },
  { key: 'avatar', label: '头像', type: 'image', sortable: false },
  { key: 'points', label: '石榴点', sortable: true, formatter: (val) => (val || 0).toFixed(2) },
  { key: 'bio', label: '简介', type: 'content', sortable: false },
  { key: 'email', label: '邮箱', type: 'content', sortable: false },
  { key: 'location', label: 'IP属地', sortable: false },
  { key: 'personality_tags', label: '个性标签', type: 'personality-tags', sortable: false },
  { key: 'follow_count', label: '关注数', sortable: false },
  { key: 'fans_count', label: '粉丝数', sortable: true },
  { key: 'like_count', label: '获赞数', sortable: true },
  { key: 'is_active', label: '账号状态', type: 'boolean', sortable: false },
  { key: 'created_at', label: '注册时间', type: 'date', sortable: true }
]

const formFields = [
  { key: 'user_id', label: '汐社号', type: 'text', required: true, placeholder: '请输入汐社号', maxlength: 15 },
  { key: 'nickname', label: '昵称', type: 'text', required: true, placeholder: '请输入昵称', maxlength: 10 },
  { key: 'avatar', label: '头像', type: 'avatar-upload', placeholder: '上传头像' },
  { key: 'avatar', label: '头像URL', type: 'text', placeholder: '请输入头像URL或使用上方上传功能' },
  { key: 'bio', label: '个人简介', type: 'textarea', placeholder: '请输入个人简介' },
  { key: 'location', label: '属地', type: 'text', placeholder: '请输入属地' },
  { key: 'gender', label: '性别', type: 'select', options: [{ value: '', label: '请选择' }, { value: '男', label: '男' }, { value: '女', label: '女' }], placeholder: '请选择性别' },
  {
    key: 'zodiac_sign', label: '星座', type: 'select', options: [
      { value: '', label: '请选择' },
      { value: '白羊座', label: '白羊座' }, { value: '金牛座', label: '金牛座' }, { value: '双子座', label: '双子座' },
      { value: '巨蟹座', label: '巨蟹座' }, { value: '狮子座', label: '狮子座' }, { value: '处女座', label: '处女座' },
      { value: '天秤座', label: '天秤座' }, { value: '天蝎座', label: '天蝎座' }, { value: '射手座', label: '射手座' },
      { value: '摩羯座', label: '摩羯座' }, { value: '水瓶座', label: '水瓶座' }, { value: '双鱼座', label: '双鱼座' }
    ], placeholder: '请选择星座'
  },
  {
    key: 'mbti', label: 'MBTI', type: 'mbti-picker', dimensions: [
      {
        key: 'mbti_1',
        label: '外向/内向',
        options: [
          { value: 'E', label: 'E' },
          { value: 'I', label: 'I' }
        ]
      },
      {
        key: 'mbti_2',
        label: '感觉/直觉',
        options: [
          { value: 'S', label: 'S' },
          { value: 'N', label: 'N' }
        ]
      },
      {
        key: 'mbti_3',
        label: '思考/情感',
        options: [
          { value: 'T', label: 'T' },
          { value: 'F', label: 'F' }
        ]
      },
      {
        key: 'mbti_4',
        label: '判断/知觉',
        options: [
          { value: 'J', label: 'J' },
          { value: 'P', label: 'P' }
        ]
      }
    ], placeholder: '请选择MBTI类型'
  },
  { key: 'interests', label: '兴趣爱好', type: 'interest-input', placeholder: '请输入兴趣爱好' },
  { key: 'is_active', label: '激活状态', type: 'checkbox', checkboxLabel: '激活' },
  { key: 'verified', label: '认证状态', type: 'radio', options: [
    { value: 0, label: '无认证' },
    { value: 1, label: '官方认证' },
    { value: 2, label: '个人认证' }
  ] }
]

const searchFields = [
  { key: 'user_id', label: '汐社号', placeholder: '搜索汐社号' },
  { key: 'nickname', label: '昵称', placeholder: '搜索昵称' },
  { key: 'location', label: '属地', placeholder: '搜索属地' },
  {
    key: 'is_active',
    label: '账号状态',
    type: 'select',
    placeholder: '账号状态',
    options: [
      { value: '', label: '全部状态' },
      { value: '1', label: '激活' },
      { value: '0', label: '未激活' }
    ]
  }
]

// 自定义操作按钮
const customActions = [
  { key: 'edit', icon: 'edit', title: '编辑用户' },
  { key: 'adjustPoints', icon: 'coin', title: '调整余额' },
  { key: 'delete', icon: 'delete', title: '删除用户' }
]

// 调整余额相关状态
const showAdjustModal = ref(false)
const selectedUser = ref(null)
const currentPoints = ref(0)
const adjustAmount = ref(null)
const adjustReason = ref('')
const adjustError = ref('')
const isSubmitting = ref(false)

// 处理自定义操作
const handleCustomAction = async ({ action, item }) => {
  if (action === 'adjustPoints') {
    selectedUser.value = item
    currentPoints.value = item.points || 0
    adjustAmount.value = null
    adjustReason.value = ''
    adjustError.value = ''
    showAdjustModal.value = true
  } else if (action === 'edit') {
    // 调用 CrudTable 的编辑方法
    if (crudTable.value) {
      crudTable.value.editItem(item)
    }
  } else if (action === 'delete') {
    // 调用 CrudTable 的删除方法
    if (crudTable.value) {
      crudTable.value.deleteItem(item)
    }
  }
}

// 关闭调整弹窗
const closeAdjustModal = () => {
  showAdjustModal.value = false
  selectedUser.value = null
  adjustAmount.value = null
  adjustReason.value = ''
  adjustError.value = ''
}

// 提交余额调整
const submitAdjust = async () => {
  if (!adjustAmount.value || adjustAmount.value === 0) {
    adjustError.value = '请输入有效的调整金额'
    return
  }

  isSubmitting.value = true
  adjustError.value = ''

  try {
    const response = await adminApi.adjustUserPoints(selectedUser.value.id, {
      amount: adjustAmount.value,
      reason: adjustReason.value
    })

    if (response.success) {
      closeAdjustModal()
      // 刷新表格数据
      if (crudTable.value) {
        crudTable.value.refreshData()
      }
    } else {
      adjustError.value = response.message || '调整失败'
    }
  } catch (error) {
    console.error('调整余额失败:', error)
    adjustError.value = error.message || '网络错误，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.user-management {
  height: 100%;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-color-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-primary);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-color-secondary);
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color-primary);
}

.modal-body {
  padding: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-color-primary);
}

.user-info strong {
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-color-primary);
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.preview {
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.preview .positive {
  color: #34c759;
}

.preview .negative {
  color: #ff6b6b;
}

.error-message {
  color: #ff3b30;
  font-size: 14px;
  padding: 8px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color-primary);
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color-primary);
  color: var(--text-color-primary);
}

.btn-outline:hover {
  background: var(--bg-color-secondary);
}

.btn-primary {
  background: var(--primary-color);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>