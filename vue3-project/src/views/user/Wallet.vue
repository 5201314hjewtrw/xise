<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'
import { useUserStore } from '@/stores/user'
import { useBalanceStore } from '@/stores/balance'
import { balanceApi } from '@/api/index.js'
import SvgIcon from '@/components/SvgIcon.vue'
import BackToTopButton from '@/components/BackToTopButton.vue'
import { formatTime } from '@/utils/timeFormat'

const router = useRouter()
const navigationStore = useNavigationStore()
const userStore = useUserStore()
const balanceStore = useBalanceStore()

// Tab状态
const activeTab = ref('balance') // 'balance', 'orders', 'transactions'
const tabs = [
  { name: 'balance', label: '余额中心' },
  { name: 'orders', label: '订单详情' },
  { name: 'transactions', label: '交易记录' }
]

// 兑换相关
const exchangeTab = ref('in') // 'in' or 'out'
const exchangeAmount = ref('')
const message = ref('')
const messageType = ref('info')

// 订单记录
const orders = ref([])
const ordersLoading = ref(false)
const ordersPagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })

// 交易记录
const transactions = ref([])
const transactionsLoading = ref(false)
const transactionsPagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })

// 加载订单记录
const loadOrders = async (page = 1) => {
  ordersLoading.value = true
  try {
    const response = await balanceApi.getOrders({ page, limit: 10 })
    if (response.success) {
      orders.value = response.data.orders
      ordersPagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('获取订单记录失败:', error)
  } finally {
    ordersLoading.value = false
  }
}

// 加载交易记录
const loadTransactions = async (page = 1) => {
  transactionsLoading.value = true
  try {
    const response = await balanceApi.getTransactions({ page, limit: 10 })
    if (response.success) {
      transactions.value = response.data.transactions
      transactionsPagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('获取交易记录失败:', error)
  } finally {
    transactionsLoading.value = false
  }
}

// 处理兑换
const handleExchange = async () => {
  if (!exchangeAmount.value || exchangeAmount.value <= 0) {
    return
  }

  const amount = parseFloat(exchangeAmount.value)
  let result

  if (exchangeTab.value === 'in') {
    result = await balanceStore.exchangeIn(amount)
  } else {
    result = await balanceStore.exchangeOut(amount)
  }

  if (result.success) {
    message.value = result.message || '操作成功'
    messageType.value = 'success'
    exchangeAmount.value = ''
    // 刷新交易记录
    loadTransactions()
  } else {
    message.value = result.message || '操作失败'
    messageType.value = 'error'
  }

  // 3秒后清除消息
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

// 切换Tab时加载数据
watch(activeTab, (newTab) => {
  if (newTab === 'orders' && orders.value.length === 0) {
    loadOrders()
  } else if (newTab === 'transactions' && transactions.value.length === 0) {
    loadTransactions()
  }
})

// 获取交易类型显示文本
const getTransactionTypeLabel = (type) => {
  const typeMap = {
    'exchange_in': '兑入',
    'exchange_out': '兑出',
    'purchase': '购买内容',
    'earning': '内容收入'
  }
  return typeMap[type] || type
}

// 获取交易类型样式类
const getTransactionTypeClass = (type) => {
  if (type === 'exchange_in' || type === 'earning') {
    return 'type-income'
  }
  return 'type-expense'
}

// 跳转到帖子详情
const goToPost = (postId) => {
  if (postId) {
    router.push({ name: 'post_detail', query: { id: postId } })
  }
}

onMounted(async () => {
  navigationStore.scrollToTop('instant')
  
  if (!userStore.isLoggedIn) {
    console.warn('用户未登录，跳转回首页')
    router.push('/')
    return
  }

  // 获取配置和余额
  await balanceStore.fetchConfig()
  // 无论余额中心是否启用，都获取余额（会自动处理）
  await balanceStore.fetchUserBalance()
})
</script>

<template>
  <div class="wallet-container">
    <!-- 页面头部 -->
    <div class="header">
      <div class="header-left"></div>
      <div class="header-title">钱包</div>
      <div class="header-right"></div>
    </div>

    <!-- 余额卡片区域 -->
    <div class="balance-section">
      <div class="balance-cards">
        <div class="balance-card external" v-if="balanceStore.enabled">
          <div class="balance-info">
            <div class="balance-label">余额</div>
            <div class="balance-value">
              <span v-if="balanceStore.isLoading" class="loading">加载中...</span>
              <span v-else class="amount">{{ balanceStore.externalBalance.toFixed(2) }}</span>
            </div>
          </div>
          <div v-if="balanceStore.vipLevel > 0" class="vip-badge">
            VIP {{ balanceStore.vipLevel }}
          </div>
        </div>
        
        <div class="balance-card local">
          <div class="balance-info">
            <div class="balance-label">石榴点</div>
            <div class="balance-value">
              <span v-if="balanceStore.isLoading" class="loading">加载中...</span>
              <span v-else class="amount">{{ balanceStore.localPoints.toFixed(2) }}</span>
            </div>
          </div>
          <div class="points-icon">🍒</div>
        </div>
      </div>
    </div>

    <!-- Tab栏 -->
    <div class="tab-bar">
      <div 
        v-for="tab in tabs" 
        :key="tab.name"
        class="tab-item"
        :class="{ active: activeTab === tab.name }"
        @click="activeTab = tab.name"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 余额中心Tab -->
      <div v-if="activeTab === 'balance'" class="balance-tab">
        <!-- 兑换比例说明 -->
        <div v-if="balanceStore.enabled" class="rate-info">
          <div class="rate-item">
            <span class="rate-label">兑入比例</span>
            <span class="rate-value">1 余额 = {{ balanceStore.exchangeRateIn }} 石榴点</span>
          </div>
          <div class="rate-item">
            <span class="rate-label">兑出比例</span>
            <span class="rate-value">1 石榴点 = {{ balanceStore.exchangeRateOut }} 余额</span>
          </div>
        </div>

        <!-- 兑换操作 -->
        <div v-if="balanceStore.enabled" class="exchange-section">
          <div class="exchange-tabs">
            <button 
              class="exchange-tab-btn" 
              :class="{ active: exchangeTab === 'in' }" 
              @click="exchangeTab = 'in'"
            >
              兑入
            </button>
            <button 
              class="exchange-tab-btn" 
              :class="{ active: exchangeTab === 'out' }" 
              @click="exchangeTab = 'out'"
            >
              兑出
            </button>
          </div>

          <div class="exchange-form">
            <div class="form-group">
              <label>{{ exchangeTab === 'in' ? '兑入金额' : '兑出石榴点' }}</label>
              <input 
                v-model="exchangeAmount" 
                type="number" 
                min="0" 
                step="0.01"
                :placeholder="exchangeTab === 'in' ? '请输入要转入的余额' : '请输入要转出的石榴点'"
              />
            </div>
            
            <div v-if="exchangeAmount > 0" class="exchange-preview">
              <span v-if="exchangeTab === 'in'">
                将获得 <strong>{{ (exchangeAmount * balanceStore.exchangeRateIn).toFixed(2) }}</strong> 石榴点
              </span>
              <span v-else>
                将获得 <strong>{{ (exchangeAmount * balanceStore.exchangeRateOut).toFixed(2) }}</strong> 余额
              </span>
            </div>

            <button 
              class="submit-btn" 
              :disabled="!exchangeAmount || exchangeAmount <= 0 || balanceStore.isLoading"
              @click="handleExchange"
            >
              {{ balanceStore.isLoading ? '处理中...' : (exchangeTab === 'in' ? '确认兑入' : '确认兑出') }}
            </button>
          </div>
        </div>

        <!-- 未启用余额中心时的提示 -->
        <div v-if="!balanceStore.enabled" class="not-enabled-tip">
          <SvgIcon name="info" width="48" height="48" />
          <p>余额中心功能未启用</p>
        </div>

        <!-- 提示信息 -->
        <div v-if="message" class="message" :class="messageType">
          {{ message }}
        </div>
      </div>

      <!-- 订单详情Tab -->
      <div v-if="activeTab === 'orders'" class="orders-tab">
        <div v-if="ordersLoading" class="loading-state">
          <SvgIcon name="loading" width="32" height="32" class="loading-icon" />
          <p>加载中...</p>
        </div>

        <div v-else-if="orders.length === 0" class="empty-state">
          <SvgIcon name="empty" width="64" height="64" class="empty-icon" />
          <h3>暂无订单</h3>
          <p>您还没有购买过任何付费内容</p>
        </div>

        <div v-else class="orders-list">
          <div 
            v-for="order in orders" 
            :key="order.id" 
            class="order-item"
            @click="goToPost(order.postId)"
          >
            <div class="order-cover">
              <img v-if="order.postCover" :src="order.postCover" alt="封面" />
              <div v-else class="no-cover">
                <SvgIcon :name="order.postType === 2 ? 'video' : 'imgNote'" width="24" height="24" />
              </div>
            </div>
            <div class="order-info">
              <div class="order-title">{{ order.postTitle }}</div>
              <div class="order-author">
                <img v-if="order.authorAvatar" :src="order.authorAvatar" alt="头像" class="author-avatar" />
                <span>{{ order.authorName }}</span>
              </div>
              <div class="order-meta">
                <span class="order-price">🍒 {{ order.price.toFixed(2) }}</span>
                <span class="order-time">{{ formatTime(order.purchasedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="ordersPagination.totalPages > 1" class="pagination">
            <button 
              :disabled="ordersPagination.page <= 1"
              @click="loadOrders(ordersPagination.page - 1)"
            >
              上一页
            </button>
            <span>{{ ordersPagination.page }} / {{ ordersPagination.totalPages }}</span>
            <button 
              :disabled="ordersPagination.page >= ordersPagination.totalPages"
              @click="loadOrders(ordersPagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <!-- 交易记录Tab -->
      <div v-if="activeTab === 'transactions'" class="transactions-tab">
        <div v-if="transactionsLoading" class="loading-state">
          <SvgIcon name="loading" width="32" height="32" class="loading-icon" />
          <p>加载中...</p>
        </div>

        <div v-else-if="transactions.length === 0" class="empty-state">
          <SvgIcon name="empty" width="64" height="64" class="empty-icon" />
          <h3>暂无交易记录</h3>
          <p>您还没有任何石榴点交易记录</p>
        </div>

        <div v-else class="transactions-list">
          <div 
            v-for="tx in transactions" 
            :key="tx.id" 
            class="transaction-item"
          >
            <div class="tx-left">
              <div class="tx-type" :class="getTransactionTypeClass(tx.type)">
                {{ getTransactionTypeLabel(tx.type) }}
              </div>
              <div class="tx-reason">{{ tx.reason || '-' }}</div>
              <div class="tx-time">{{ formatTime(tx.createdAt) }}</div>
            </div>
            <div class="tx-right">
              <div class="tx-amount" :class="{ positive: tx.amount > 0, negative: tx.amount < 0 }">
                {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toFixed(2) }}
              </div>
              <div class="tx-balance">余额: {{ tx.balanceAfter.toFixed(2) }}</div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="transactionsPagination.totalPages > 1" class="pagination">
            <button 
              :disabled="transactionsPagination.page <= 1"
              @click="loadTransactions(transactionsPagination.page - 1)"
            >
              上一页
            </button>
            <span>{{ transactionsPagination.page }} / {{ transactionsPagination.totalPages }}</span>
            <button 
              :disabled="transactionsPagination.page >= transactionsPagination.totalPages"
              @click="loadTransactions(transactionsPagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 回到顶部按钮 -->
    <BackToTopButton />
  </div>
</template>

<style scoped>
/* ---------- 1. 全局样式设置 ---------- */
* {
  box-sizing: border-box;
}

/* ---------- 2. 布局容器样式 ---------- */
.wallet-container {
  padding-top: 72px;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  background: var(--bg-color-primary);
  padding-bottom: 40px;
  min-height: 100vh;
  transition: background-color 0.2s ease;
}

/* ---------- 3. 顶部导航栏样式 ---------- */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--bg-color-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  transition: background-color 0.2s ease;
}

.header-left,
.header-right {
  width: 48px;
  height: 48px;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-color-primary);
  transition: color 0.2s ease;
}

/* ---------- 4. 余额卡片样式 ---------- */
.balance-section {
  padding: 16px;
}

.balance-cards {
  display: flex;
  gap: 12px;
}

.balance-card {
  flex: 1;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-card.external {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
}

.balance-card.local {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.balance-info {
  color: white;
}

.balance-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.balance-value {
  font-size: 24px;
  font-weight: 700;
}

.balance-value .loading {
  font-size: 14px;
  opacity: 0.8;
}

.points-icon {
  font-size: 28px;
}

.vip-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* ---------- 5. Tab栏样式 ---------- */
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-color-primary);
  padding: 0 16px;
  background: var(--bg-color-primary);
}

.tab-item {
  flex: 1;
  padding: 14px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-color-secondary);
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
}

.tab-item:hover {
  color: var(--text-color-primary);
}

.tab-item.active {
  color: var(--primary-color);
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: var(--primary-color);
  border-radius: 2px;
}

/* ---------- 6. 内容区域样式 ---------- */
.content-area {
  padding: 16px;
}

/* 余额中心Tab */
.balance-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rate-info {
  background: var(--bg-color-secondary);
  border-radius: 8px;
  padding: 12px;
}

.rate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.rate-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color-primary);
}

.rate-label {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.rate-value {
  font-size: 14px;
  color: var(--text-color-primary);
  font-weight: 500;
}

.exchange-section {
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  border-radius: 12px;
  padding: 16px;
}

.exchange-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.exchange-tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-primary);
  color: var(--text-color-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exchange-tab-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.exchange-tab-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.exchange-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  padding: 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.exchange-preview {
  font-size: 13px;
  color: var(--text-color-secondary);
  padding: 10px;
  background: var(--bg-color-secondary);
  border-radius: 6px;
}

.exchange-preview strong {
  color: var(--primary-color);
  font-size: 16px;
}

.submit-btn {
  padding: 14px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.not-enabled-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-color-secondary);
}

.not-enabled-tip p {
  margin-top: 16px;
  font-size: 14px;
}

/* 消息提示 */
.message {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.message.success {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.message.error {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.message.info {
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
}

/* ---------- 7. 订单列表样式 ---------- */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-color-secondary);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-item:hover {
  background: var(--bg-color-tertiary);
}

.order-cover {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.order-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-cover .no-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color-tertiary);
  color: var(--text-color-quaternary);
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.order-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.author-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.order-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.order-price {
  color: #ff6b6b;
  font-weight: 500;
}

.order-time {
  color: var(--text-color-quaternary);
}

/* ---------- 8. 交易记录样式 ---------- */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: var(--bg-color-secondary);
  border-radius: 10px;
}

.tx-left {
  flex: 1;
  min-width: 0;
}

.tx-type {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.tx-type.type-income {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.tx-type.type-expense {
  background: rgba(255, 149, 0, 0.1);
  color: #ff9500;
}

.tx-reason {
  font-size: 13px;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.tx-time {
  font-size: 11px;
  color: var(--text-color-quaternary);
}

.tx-right {
  text-align: right;
  flex-shrink: 0;
}

.tx-amount {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tx-amount.positive {
  color: #34c759;
}

.tx-amount.negative {
  color: #ff6b6b;
}

.tx-balance {
  font-size: 11px;
  color: var(--text-color-quaternary);
}

/* ---------- 9. 加载和空状态样式 ---------- */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 40px 16px;
  text-align: center;
}

.loading-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 16px;
}

.empty-state h3 {
  color: var(--text-color-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin: 0;
}

/* ---------- 10. 分页样式 ---------- */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid var(--border-color-primary);
  border-radius: 6px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  font-size: 13px;
  color: var(--text-color-secondary);
}

/* ---------- 11. 响应式适配 ---------- */
@media (min-width: 901px) {
  .wallet-container {
    max-width: 600px;
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
