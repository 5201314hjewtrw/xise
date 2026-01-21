/**
 * 汐社校园图文社区 - Swagger API 文档配置
 * 
 * @author ZTMYO
 * @github https://github.com/ZTMYO
 * @description Swagger API 文档自动生成配置
 * @version v1.3.0
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '汐社校园图文社区 API',
      version: '1.3.0',
      description: '基于 Express 框架的图文社区后端 API 服务文档',
      contact: {
        name: 'ZTMYO',
        url: 'https://github.com/ZTMYO'
      },
      license: {
        name: 'GPLv3',
        url: 'https://www.gnu.org/licenses/gpl-3.0.html'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API 服务'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 认证令牌'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '用户ID' },
            user_id: { type: 'string', description: '用户账号' },
            nickname: { type: 'string', description: '用户昵称' },
            avatar: { type: 'string', description: '头像URL' },
            bio: { type: 'string', description: '个人简介' },
            location: { type: 'string', description: '所在地' },
            follow_count: { type: 'integer', description: '关注数' },
            fans_count: { type: 'integer', description: '粉丝数' },
            like_count: { type: 'integer', description: '获赞数' },
            verified: { type: 'boolean', description: '是否认证' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '帖子ID' },
            user_id: { type: 'integer', description: '作者ID' },
            title: { type: 'string', description: '标题' },
            content: { type: 'string', description: '内容' },
            type: { type: 'integer', description: '类型: 1-图文, 2-视频' },
            category_id: { type: 'integer', description: '分类ID' },
            view_count: { type: 'integer', description: '浏览数' },
            like_count: { type: 'integer', description: '点赞数' },
            collect_count: { type: 'integer', description: '收藏数' },
            comment_count: { type: 'integer', description: '评论数' },
            is_draft: { type: 'boolean', description: '是否草稿' },
            visibility: { type: 'string', enum: ['public', 'private', 'friends_only'], description: '可见性' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '评论ID' },
            post_id: { type: 'integer', description: '帖子ID' },
            user_id: { type: 'integer', description: '用户ID' },
            content: { type: 'string', description: '评论内容' },
            parent_id: { type: 'integer', description: '父评论ID' },
            like_count: { type: 'integer', description: '点赞数' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: '通知ID' },
            user_id: { type: 'integer', description: '接收用户ID' },
            type: { type: 'string', description: '通知类型' },
            content: { type: 'string', description: '通知内容' },
            is_read: { type: 'boolean', description: '是否已读' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: '响应码' },
            message: { type: 'string', description: '响应消息' },
            data: { type: 'object', description: '响应数据' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: '响应码' },
            message: { type: 'string', description: '响应消息' },
            data: {
              type: 'object',
              properties: {
                list: { type: 'array', items: {}, description: '数据列表' },
                total: { type: 'integer', description: '总数' },
                page: { type: 'integer', description: '当前页码' },
                limit: { type: 'integer', description: '每页数量' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'integer', description: '错误码' },
            message: { type: 'string', description: '错误消息' }
          }
        }
      }
    },
    tags: [
      { name: '认证', description: '用户认证相关接口' },
      { name: '用户', description: '用户管理相关接口' },
      { name: '帖子', description: '帖子内容相关接口' },
      { name: '评论', description: '评论相关接口' },
      { name: '点赞', description: '点赞收藏相关接口' },
      { name: '标签', description: '标签分类相关接口' },
      { name: '搜索', description: '搜索相关接口' },
      { name: '通知', description: '通知消息相关接口' },
      { name: '上传', description: '文件上传相关接口' },
      { name: '统计', description: '数据统计相关接口' },
      { name: '管理', description: '后台管理相关接口' },
      { name: '余额', description: '用户余额相关接口' },
      { name: '创作中心', description: '创作者中心相关接口' }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
