/**
 * 简单内存缓存工具
 * 
 * 用于缓存低变更频率的数据，减少数据库查询
 * 适用于分类、标签等数据
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any} 缓存值，不存在时返回 undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    // 检查是否过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttlMs - 过期时间（毫秒），默认5分钟
   */
  set(key, value, ttlMs = 5 * 60 * 1000) {
    // 清除旧的定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expireAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    this.cache.set(key, { value, expireAt });

    // 设置自动清理定时器
    if (ttlMs > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttlMs);
      this.timers.set(key, timer);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 创建全局缓存实例
const globalCache = new SimpleCache();

// 缓存TTL配置（毫秒）
const CACHE_TTL = {
  CATEGORIES: 10 * 60 * 1000,      // 分类缓存10分钟
  TAGS_POPULAR: 5 * 60 * 1000,      // 热门标签缓存5分钟
  USER_STATS: 1 * 60 * 1000,        // 用户统计缓存1分钟
  SYSTEM_SETTINGS: 30 * 60 * 1000   // 系统设置缓存30分钟
};

/**
 * 获取或设置缓存（带自动加载）
 * @param {string} key - 缓存键
 * @param {Function} loader - 数据加载函数
 * @param {number} ttlMs - 过期时间
 * @returns {Promise<any>} 缓存值
 */
async function getOrSet(key, loader, ttlMs = 5 * 60 * 1000) {
  let value = globalCache.get(key);
  if (value !== undefined) {
    return value;
  }

  // 缓存不存在，调用加载函数
  value = await loader();
  globalCache.set(key, value, ttlMs);
  return value;
}

/**
 * 使缓存失效
 * @param {string} keyPattern - 缓存键模式（支持简单的前缀匹配）
 */
function invalidate(keyPattern) {
  if (keyPattern.endsWith('*')) {
    // 前缀匹配
    const prefix = keyPattern.slice(0, -1);
    const keysToDelete = [];
    globalCache.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => globalCache.delete(key));
  } else {
    globalCache.delete(keyPattern);
  }
}

module.exports = {
  cache: globalCache,
  CACHE_TTL,
  getOrSet,
  invalidate
};
