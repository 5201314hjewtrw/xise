const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /system-notifications/pending:
 *   get:
 *     summary: 获取当前用户未确认的活跃系统通知
 *     tags: [通知]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回未确认的系统通知列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       type:
 *                         type: string
 *                       priority:
 *                         type: integer
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
// 获取当前用户未确认的活跃系统通知
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const now = new Date();

    // 查找所有活跃的、在有效期内的、用户未确认的系统通知
    // 简化时间条件：(start_time IS NULL OR start_time <= now) AND (end_time IS NULL OR end_time >= now)
    const notifications = await prisma.systemNotification.findMany({
      where: {
        is_active: true,
        AND: [
          // 开始时间条件：未设置或已开始
          {
            OR: [
              { start_time: null },
              { start_time: { lte: now } }
            ]
          },
          // 结束时间条件：未设置或未结束
          {
            OR: [
              { end_time: null },
              { end_time: { gte: now } }
            ]
          }
        ],
        // 用户未确认过
        NOT: {
          confirmations: {
            some: {
              user_id: userId
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedNotifications = notifications.map(n => ({
      id: Number(n.id),
      title: n.title,
      content: n.content,
      type: n.type,
      image_url: n.image_url,
      link_url: n.link_url,
      created_at: n.created_at
    }));

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        notifications: formattedNotifications
      }
    });
  } catch (error) {
    console.error('获取系统通知失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      code: RESPONSE_CODES.ERROR, 
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR 
    });
  }
});

/**
 * @swagger
 * /system-notifications/pending-count:
 *   get:
 *     summary: 获取未确认系统通知的数量
 *     tags: [通知]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回未确认系统通知数量
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       description: 未确认的系统通知数量
 *                       example: 3
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
// 获取未确认系统通知的数量
router.get('/pending-count', authenticateToken, async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const now = new Date();

    // 计算未确认的系统通知数量
    const count = await prisma.systemNotification.count({
      where: {
        is_active: true,
        AND: [
          {
            OR: [
              { start_time: null },
              { start_time: { lte: now } }
            ]
          },
          {
            OR: [
              { end_time: null },
              { end_time: { gte: now } }
            ]
          }
        ],
        NOT: {
          confirmations: {
            some: {
              user_id: userId
            }
          }
        }
      }
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: { count }
    });
  } catch (error) {
    console.error('获取系统通知数量失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      code: RESPONSE_CODES.ERROR, 
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR 
    });
  }
});

/**
 * @swagger
 * /system-notifications/{id}/confirm:
 *   post:
 *     summary: 确认系统通知
 *     tags: [通知]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 系统通知ID
 *     responses:
 *       200:
 *         description: 确认成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 确认成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 通知不存在
 *       500:
 *         description: 服务器内部错误
 */
// 确认系统通知（用户点击确认后调用）
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const notificationId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    // 检查通知是否存在
    const notification = await prisma.systemNotification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ 
        code: RESPONSE_CODES.NOT_FOUND, 
        message: '通知不存在' 
      });
    }

    // 创建确认记录（如果已存在则忽略）
    await prisma.systemNotificationConfirmation.upsert({
      where: {
        uk_notification_user: {
          notification_id: notificationId,
          user_id: userId
        }
      },
      update: {}, // 已存在则不更新
      create: {
        notification_id: notificationId,
        user_id: userId
      }
    });

    res.json({ 
      code: RESPONSE_CODES.SUCCESS, 
      message: '确认成功' 
    });
  } catch (error) {
    console.error('确认系统通知失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      code: RESPONSE_CODES.ERROR, 
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR 
    });
  }
});

/**
 * @swagger
 * /system-notifications/history:
 *   get:
 *     summary: 获取所有系统通知列表（包括历史的）
 *     tags: [通知]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [system, activity]
 *         description: 通知类型
 *     responses:
 *       200:
 *         description: 成功返回系统通知列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
// 获取所有系统通知列表（包括历史的）
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type; // 可选：system 或 activity

    const where = { is_active: true };
    if (type) {
      where.type = type;
    }

    const [total, notifications] = await Promise.all([
      prisma.systemNotification.count({ where }),
      prisma.systemNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: skip
      })
    ]);

    const formattedNotifications = notifications.map(n => ({
      id: Number(n.id),
      title: n.title,
      content: n.content,
      type: n.type,
      image_url: n.image_url,
      link_url: n.link_url,
      start_time: n.start_time,
      end_time: n.end_time,
      created_at: n.created_at
    }));

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        notifications: formattedNotifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取系统通知历史失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      code: RESPONSE_CODES.ERROR, 
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR 
    });
  }
});

module.exports = router;
