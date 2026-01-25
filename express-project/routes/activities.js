/**
 * 活动系统路由
 * 处理用户端活动相关功能
 */

const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

// 获取活动列表（用户端，仅返回进行中的活动）
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    // 查询条件：活动进行中或激活状态
    const where = {
      is_active: true,
      status: 'active',
      start_time: { lte: now },
      end_time: { gte: now }
    };

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          _count: {
            select: {
              participations: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: skip
      })
    ]);

    const formattedActivities = activities.map(a => ({
      id: Number(a.id),
      name: a.name,
      content: a.content,
      reward: a.reward,
      reward_amount: a.reward_amount ? parseFloat(a.reward_amount) : null,
      target_likes: a.target_likes,
      target_comments: a.target_comments,
      target_collections: a.target_collections,
      target_views: a.target_views,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      image_url: a.image_url,
      tags: a.tags.map(t => ({
        id: t.tag.id,
        name: t.tag.name
      })),
      participant_count: a._count.participations,
      created_at: a.created_at
    }));

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        list: formattedActivities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取活动列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// 获取活动详情
router.get('/:id', async (req, res) => {
  try {
    const activityId = BigInt(req.params.id);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        _count: {
          select: {
            participations: true
          }
        }
      }
    });

    if (!activity) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '活动不存在'
      });
    }

    const formattedActivity = {
      id: Number(activity.id),
      name: activity.name,
      content: activity.content,
      reward: activity.reward,
      reward_amount: activity.reward_amount ? parseFloat(activity.reward_amount) : null,
      target_likes: activity.target_likes,
      target_comments: activity.target_comments,
      target_collections: activity.target_collections,
      target_views: activity.target_views,
      start_time: activity.start_time,
      end_time: activity.end_time,
      status: activity.status,
      image_url: activity.image_url,
      tags: activity.tags.map(t => ({
        id: t.tag.id,
        name: t.tag.name
      })),
      participant_count: activity._count.participations,
      created_at: activity.created_at
    };

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: formattedActivity
    });
  } catch (error) {
    console.error('获取活动详情失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// 参与活动
router.post('/:id/participate', authenticateToken, async (req, res) => {
  try {
    const activityId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);
    const { post_id } = req.body;

    // 检查活动是否存在且进行中
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '活动不存在'
      });
    }

    const now = new Date();
    if (activity.status !== 'active' || activity.end_time < now) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '活动已结束或未开始'
      });
    }

    // 检查是否已参与
    const existing = await prisma.activityParticipation.findUnique({
      where: {
        uk_activity_user: {
          activity_id: activityId,
          user_id: userId
        }
      }
    });

    if (existing) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '您已参与此活动'
      });
    }

    // 创建参与记录
    const participation = await prisma.activityParticipation.create({
      data: {
        activity_id: activityId,
        user_id: userId,
        post_id: post_id ? BigInt(post_id) : null
      }
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '参与活动成功',
      data: {
        id: Number(participation.id),
        activity_id: Number(activityId),
        created_at: participation.created_at
      }
    });
  } catch (error) {
    console.error('参与活动失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// 获取用户参与的活动列表
router.get('/user/participated', authenticateToken, async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [total, participations] = await Promise.all([
      prisma.activityParticipation.count({
        where: { user_id: userId }
      }),
      prisma.activityParticipation.findMany({
        where: { user_id: userId },
        include: {
          activity: {
            include: {
              tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: skip
      })
    ]);

    const formattedList = participations.map(p => ({
      id: Number(p.id),
      activity: {
        id: Number(p.activity.id),
        name: p.activity.name,
        content: p.activity.content,
        reward: p.activity.reward,
        reward_amount: p.activity.reward_amount ? parseFloat(p.activity.reward_amount) : null,
        target_likes: p.activity.target_likes,
        target_comments: p.activity.target_comments,
        target_collections: p.activity.target_collections,
        target_views: p.activity.target_views,
        start_time: p.activity.start_time,
        end_time: p.activity.end_time,
        status: p.activity.status,
        image_url: p.activity.image_url,
        tags: p.activity.tags.map(t => ({
          id: t.tag.id,
          name: t.tag.name
        }))
      },
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      collections_count: p.collections_count,
      views_count: p.views_count,
      is_completed: p.is_completed,
      is_rewarded: p.is_rewarded,
      created_at: p.created_at
    }));

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        list: formattedList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取参与活动列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// 获取用户某个活动的参与状态
router.get('/:id/participation-status', authenticateToken, async (req, res) => {
  try {
    const activityId = BigInt(req.params.id);
    const userId = BigInt(req.user.id);

    const participation = await prisma.activityParticipation.findUnique({
      where: {
        uk_activity_user: {
          activity_id: activityId,
          user_id: userId
        }
      }
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        participated: !!participation,
        participation: participation ? {
          id: Number(participation.id),
          likes_count: participation.likes_count,
          comments_count: participation.comments_count,
          collections_count: participation.collections_count,
          views_count: participation.views_count,
          is_completed: participation.is_completed,
          is_rewarded: participation.is_rewarded,
          created_at: participation.created_at
        } : null
      }
    });
  } catch (error) {
    console.error('获取参与状态失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

module.exports = router;
