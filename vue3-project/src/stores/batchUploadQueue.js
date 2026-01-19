import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import apiConfig from '@/config/api.js'

/**
 * 批量上传队列管理 Store
 * 
 * 功能：
 * 1. 持久化存储上传队列到 localStorage，防止刷新丢失
 * 2. 管理上传任务状态（pending, uploading, queued, completed, failed）
 * 3. 支持重试失败的任务
 * 4. 与后端异步队列集成
 */
export const useBatchUploadQueueStore = defineStore('batchUploadQueue', () => {
  // 本地存储键名
  const STORAGE_KEY = 'batch_upload_queue'
  
  // 任务状态常量
  const TASK_STATUS = {
    PENDING: 'pending',       // 等待处理
    UPLOADING: 'uploading',   // 正在上传文件
    QUEUED: 'queued',         // 已加入后端队列
    PROCESSING: 'processing', // 后端正在处理
    COMPLETED: 'completed',   // 已完成
    FAILED: 'failed'          // 失败
  }
  
  // 上传队列任务列表
  const tasks = ref([])
  
  // 当前是否正在处理队列
  const isProcessing = ref(false)
  
  // 队列服务是否可用
  const queueServiceEnabled = ref(null)
  
  // 从 localStorage 加载任务
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 过滤掉已完成超过24小时的任务
        const now = Date.now()
        const oneDayAgo = now - 24 * 60 * 60 * 1000
        tasks.value = parsed.filter(task => {
          if (task.status === TASK_STATUS.COMPLETED && task.completedAt < oneDayAgo) {
            return false
          }
          return true
        })
        // 将正在进行中的任务重置为 pending（页面刷新后需要重新处理）
        tasks.value.forEach(task => {
          if (task.status === TASK_STATUS.UPLOADING || task.status === TASK_STATUS.PROCESSING) {
            task.status = TASK_STATUS.PENDING
            task.error = null
          }
        })
        saveToStorage()
      }
    } catch (error) {
      console.error('从 localStorage 加载上传队列失败:', error)
      tasks.value = []
    }
  }
  
  // 保存任务到 localStorage
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value))
    } catch (error) {
      console.error('保存上传队列到 localStorage 失败:', error)
    }
  }
  
  // 监听任务变化，自动保存
  watch(tasks, saveToStorage, { deep: true })
  
  // 生成任务ID
  const generateTaskId = () => {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
  
  // 计算属性
  const pendingTasks = computed(() => 
    tasks.value.filter(t => t.status === TASK_STATUS.PENDING)
  )
  
  const processingTasks = computed(() => 
    tasks.value.filter(t => [TASK_STATUS.UPLOADING, TASK_STATUS.QUEUED, TASK_STATUS.PROCESSING].includes(t.status))
  )
  
  const completedTasks = computed(() => 
    tasks.value.filter(t => t.status === TASK_STATUS.COMPLETED)
  )
  
  const failedTasks = computed(() => 
    tasks.value.filter(t => t.status === TASK_STATUS.FAILED)
  )
  
  const hasPendingTasks = computed(() => pendingTasks.value.length > 0)
  const hasFailedTasks = computed(() => failedTasks.value.length > 0)
  
  // 获取认证头
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json'
    }
    const adminToken = localStorage.getItem('admin_token')
    if (adminToken) {
      headers.Authorization = `Bearer ${adminToken}`
    }
    return headers
  }
  
  // 添加批量上传任务
  const addTask = (taskData) => {
    const task = {
      id: generateTaskId(),
      status: TASK_STATUS.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      error: null,
      retryCount: 0,
      maxRetries: 3,
      progress: 0,
      // 任务数据
      userId: taskData.userId,
      type: taskData.type || 1,
      isDraft: taskData.isDraft || false,
      tags: taskData.tags || [],
      notes: taskData.notes || [],
      // 后端任务信息
      jobId: null,
      batchId: null,
      result: null
    }
    
    tasks.value.push(task)
    return task.id
  }
  
  // 更新任务状态
  const updateTask = (taskId, updates) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      Object.assign(task, updates, { updatedAt: Date.now() })
    }
  }
  
  // 移除任务
  const removeTask = (taskId) => {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
    }
  }
  
  // 清除已完成的任务
  const clearCompletedTasks = () => {
    tasks.value = tasks.value.filter(t => t.status !== TASK_STATUS.COMPLETED)
  }
  
  // 清除所有任务
  const clearAllTasks = () => {
    tasks.value = []
  }
  
  // 检查队列服务是否可用
  const checkQueueService = async () => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/admin/queue-names`, {
        headers: getAuthHeaders()
      })
      const result = await response.json()
      queueServiceEnabled.value = result.code === 200 && result.data?.enabled === true
      return queueServiceEnabled.value
    } catch (error) {
      console.error('检查队列服务状态失败:', error)
      queueServiceEnabled.value = false
      return false
    }
  }
  
  // 处理单个任务（提交到后端队列）
  const processTask = async (taskId) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return { success: false, error: '任务不存在' }
    
    try {
      updateTask(taskId, { status: TASK_STATUS.UPLOADING, progress: 10 })
      
      // 提交到后端队列
      const response = await fetch(`${apiConfig.baseURL}/admin/batch-upload/queue`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: task.userId,
          notes: task.notes,
          tags: task.tags,
          is_draft: task.isDraft,
          type: task.type,
          batch_id: task.id
        })
      })
      
      const result = await response.json()
      
      if (result.code === 200) {
        updateTask(taskId, {
          status: TASK_STATUS.QUEUED,
          jobId: result.data.jobId,
          batchId: result.data.batchId,
          progress: 50
        })
        return { success: true, jobId: result.data.jobId }
      } else {
        throw new Error(result.message || '提交任务失败')
      }
    } catch (error) {
      console.error(`处理任务 ${taskId} 失败:`, error)
      updateTask(taskId, {
        status: TASK_STATUS.FAILED,
        error: error.message,
        retryCount: task.retryCount + 1
      })
      return { success: false, error: error.message }
    }
  }
  
  // 轮询检查任务状态
  const checkTaskStatus = async (taskId) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || !task.jobId) return null
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/admin/batch-upload/queue/${task.jobId}`, {
        headers: getAuthHeaders()
      })
      
      const result = await response.json()
      
      if (result.code === 200 && result.data) {
        const jobData = result.data
        
        // 更新进度
        let progress = task.progress
        if (jobData.progress) {
          progress = Math.max(50, Math.min(99, 50 + jobData.progress / 2))
        }
        
        if (jobData.state === 'completed') {
          updateTask(taskId, {
            status: TASK_STATUS.COMPLETED,
            progress: 100,
            completedAt: Date.now(),
            result: jobData.returnValue
          })
          return { completed: true, success: true, result: jobData.returnValue }
        } else if (jobData.state === 'failed') {
          updateTask(taskId, {
            status: TASK_STATUS.FAILED,
            error: jobData.failedReason || '任务执行失败'
          })
          return { completed: true, success: false, error: jobData.failedReason }
        } else {
          // 仍在处理中
          updateTask(taskId, {
            status: TASK_STATUS.PROCESSING,
            progress
          })
          return { completed: false }
        }
      }
      
      return null
    } catch (error) {
      console.error(`检查任务 ${taskId} 状态失败:`, error)
      return null
    }
  }
  
  // 重试失败的任务
  const retryTask = async (taskId) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return { success: false, error: '任务不存在' }
    
    if (task.retryCount >= task.maxRetries) {
      return { success: false, error: '已达到最大重试次数' }
    }
    
    // 重置任务状态
    updateTask(taskId, {
      status: TASK_STATUS.PENDING,
      error: null,
      progress: 0,
      jobId: null,
      batchId: null
    })
    
    return processTask(taskId)
  }
  
  // 处理所有待处理的任务
  const processAllPendingTasks = async () => {
    if (isProcessing.value || pendingTasks.value.length === 0) return
    
    isProcessing.value = true
    
    try {
      // 首先检查队列服务是否可用
      const serviceAvailable = await checkQueueService()
      
      if (!serviceAvailable) {
        console.log('队列服务不可用，跳过批量处理')
        return { success: false, error: '队列服务不可用' }
      }
      
      // 逐个处理待处理的任务
      for (const task of pendingTasks.value) {
        await processTask(task.id)
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      return { success: true }
    } finally {
      isProcessing.value = false
    }
  }
  
  // 启动状态轮询
  let pollInterval = null
  
  const startPolling = () => {
    if (pollInterval) return
    
    pollInterval = setInterval(async () => {
      // 检查所有 queued 或 processing 状态的任务
      const activeTasks = tasks.value.filter(t => 
        t.status === TASK_STATUS.QUEUED || t.status === TASK_STATUS.PROCESSING
      )
      
      for (const task of activeTasks) {
        await checkTaskStatus(task.id)
      }
      
      // 如果没有活跃任务，停止轮询
      if (activeTasks.length === 0) {
        stopPolling()
      }
    }, 3000) // 每3秒检查一次
  }
  
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }
  
  // 初始化
  const initialize = () => {
    loadFromStorage()
    // 如果有正在处理的任务，启动轮询
    if (processingTasks.value.length > 0) {
      startPolling()
    }
  }
  
  return {
    // 状态
    tasks,
    isProcessing,
    queueServiceEnabled,
    
    // 常量
    TASK_STATUS,
    
    // 计算属性
    pendingTasks,
    processingTasks,
    completedTasks,
    failedTasks,
    hasPendingTasks,
    hasFailedTasks,
    
    // 方法
    initialize,
    addTask,
    updateTask,
    removeTask,
    clearCompletedTasks,
    clearAllTasks,
    checkQueueService,
    processTask,
    checkTaskStatus,
    retryTask,
    processAllPendingTasks,
    startPolling,
    stopPolling
  }
})
