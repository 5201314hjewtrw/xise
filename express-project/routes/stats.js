const express = require('express');
const router = express.Router();
const { success, error } = require('../utils/responseHelper');
const { getMultipleTableStats } = require('../utils/statsHelper');

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: 获取系统统计信息
 *     tags: [统计]
 *     responses:
 *       200:
 *         description: 成功返回统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: integer
 *                       description: 用户总数
 *                     posts:
 *                       type: integer
 *                       description: 帖子总数
 *                     comments:
 *                       type: integer
 *                       description: 评论总数
 *                     likes:
 *                       type: integer
 *                       description: 点赞总数
 *       500:
 *         description: 服务器内部错误
 */
// 获取系统统计信息
router.get('/', async (req, res) => {
  try {
    // 定义需要统计的表
    const tables = [
      { table: 'users', alias: 'users' },
      { table: 'posts', alias: 'posts' },
      { table: 'comments', alias: 'comments' },
      { table: 'likes', alias: 'likes' }
    ];

    const stats = await getMultipleTableStats(tables);
    success(res, stats, '获取统计信息成功');
  } catch (err) {
    console.error('获取统计信息失败:', err);
    error(res, '获取统计信息失败');
  }
});

module.exports = router;