/**
 * 用户注册后台任务队列
 * 异步处理昵称审核和IP属地更新任务
 * 
 * @description 基于内存的任务队列，支持并发控制和任务状态跟踪
 */

const { prisma } = require('../config/config');
const { auditNickname, isAuditEnabled } = require('./contentAudit');
const { getIPLocation } = require('./ipLocation');

class RegistrationQueue {
  constructor(maxConcurrent = 3) {
    this.queue = []; // 待处理任务队列
    this.processing = new Map(); // 正在处理的任务 Map<taskId, task>
    this.maxConcurrent = maxConcurrent;
    this.taskIdCounter = 0; // 任务ID计数器
  }

  /**
   * 添加注册后处理任务到队列
   * @param {Object} taskData - 任务数据
   * @param {BigInt} taskData.userId - 用户ID
   * @param {string} taskData.nickname - 原始昵称
   * @param {string} taskData.userIdStr - 用户汐社号
   * @param {string} taskData.userIP - 用户IP地址
   * @returns {number} 任务ID
   */
  addTask(taskData) {
    const taskId = ++this.taskIdCounter;
    const task = {
      id: taskId,
      userId: taskData.userId,
      nickname: taskData.nickname,
      userIdStr: taskData.userIdStr,
      userIP: taskData.userIP,
      status: 'pending', // pending, processing, completed, failed
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null
    };

    this.queue.push(task);
    console.log(`📝 注册后处理任务已加入队列 [ID: ${taskId}] - 用户: ${taskData.userIdStr}, 队列长度: ${this.queue.length}`);

    // 尝试处理队列
    this.processQueue();

    return taskId;
  }

  /**
   * 处理队列中的任务
   */
  async processQueue() {
    // 如果已达到最大并发数，不处理新任务
    if (this.processing.size >= this.maxConcurrent) {
      console.log(`⏸️ 注册队列已达到最大并发数 ${this.maxConcurrent}，等待任务完成...`);
      return;
    }

    // 如果队列为空，不需要处理
    if (this.queue.length === 0) {
      return;
    }

    // 从队列中取出第一个任务
    const task = this.queue.shift();
    task.status = 'processing';
    task.startedAt = new Date();
    this.processing.set(task.id, task);

    console.log(`🔄 开始处理注册任务 [ID: ${task.id}] - 用户: ${task.userIdStr}`);

    try {
      // 并行处理昵称审核和IP属地获取
      const [nicknameResult, ipLocation] = await Promise.allSettled([
        this.processNicknameAudit(task),
        this.processIPLocation(task)
      ]);

      task.status = 'completed';
      task.result = {
        nicknameAudit: nicknameResult.status === 'fulfilled' ? nicknameResult.value : { error: nicknameResult.reason },
        ipLocation: ipLocation.status === 'fulfilled' ? ipLocation.value : { error: ipLocation.reason }
      };
      
      console.log(`✅ 注册任务完成 [ID: ${task.id}] - 用户: ${task.userIdStr}`);
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      console.error(`❌ 注册任务异常 [ID: ${task.id}]:`, error);
    } finally {
      task.completedAt = new Date();
      this.processing.delete(task.id);

      // 继续处理队列中的下一个任务
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * 处理昵称审核
   * @param {Object} task - 任务对象
   * @returns {Object} 处理结果
   */
  async processNicknameAudit(task) {
    if (!isAuditEnabled()) {
      // 审核未启用，直接设置昵称可见
      await prisma.user.update({
        where: { id: task.userId },
        data: { nickname_visible: true }
      });
      return { passed: true, message: '审核未启用，昵称已设为可见' };
    }

    try {
      const auditResult = await auditNickname(task.nickname, task.userIdStr);
      
      if (auditResult && auditResult.passed === false) {
        // 审核不通过，将昵称改为随机10位数字
        const randomNickname = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        await prisma.user.update({
          where: { id: task.userId },
          data: { 
            nickname: randomNickname,
            nickname_visible: true // 替换后的随机昵称可见
          }
        });
        console.log(`⚠️ 昵称审核不通过 [用户: ${task.userIdStr}]，原昵称: ${task.nickname}，替换为: ${randomNickname}`);
        return { passed: false, newNickname: randomNickname, reason: auditResult.reason };
      } else {
        // 审核通过，设置昵称可见
        await prisma.user.update({
          where: { id: task.userId },
          data: { nickname_visible: true }
        });
        console.log(`✅ 昵称审核通过 [用户: ${task.userIdStr}]，昵称已设为可见`);
        return { passed: true, message: '昵称审核通过' };
      }
    } catch (error) {
      console.error(`❌ 昵称审核异常 [用户: ${task.userIdStr}]:`, error.message);
      // 审核异常时，默认设置昵称可见（避免影响用户体验）
      await prisma.user.update({
        where: { id: task.userId },
        data: { nickname_visible: true }
      });
      return { passed: true, message: '审核异常，默认设为可见', error: error.message };
    }
  }

  /**
   * 处理IP属地更新
   * @param {Object} task - 任务对象
   * @returns {Object} 处理结果
   */
  async processIPLocation(task) {
    try {
      const ipLocation = await getIPLocation(task.userIP);
      
      if (ipLocation && ipLocation !== '未知') {
        await prisma.user.update({
          where: { id: task.userId },
          data: { location: ipLocation }
        });
        console.log(`✅ IP属地更新成功 [用户: ${task.userIdStr}]，属地: ${ipLocation}`);
        return { success: true, location: ipLocation };
      } else {
        return { success: false, location: '未知' };
      }
    } catch (error) {
      console.error(`❌ IP属地更新失败 [用户: ${task.userIdStr}]:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取任务状态
   * @param {number} taskId - 任务ID
   * @returns {Object|null} 任务信息
   */
  getTaskStatus(taskId) {
    if (this.processing.has(taskId)) {
      return this.processing.get(taskId);
    }

    const queuedTask = this.queue.find(t => t.id === taskId);
    if (queuedTask) {
      return queuedTask;
    }

    return null;
  }

  /**
   * 获取队列统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      totalTasks: this.taskIdCounter
    };
  }
}

// 创建全局队列实例
const registrationQueue = new RegistrationQueue();

module.exports = registrationQueue;
