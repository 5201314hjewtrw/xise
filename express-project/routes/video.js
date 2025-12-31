/**
 * 视频转码相关路由
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const { pool } = require('../config/config');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { 
  getJobStatus, 
  getQueueStatus,
  transcodeQueue
} = require('../utils/videoTranscode');

/**
 * 获取视频转码状态
 * GET /api/video/transcode-status/:postId
 */
router.get('/transcode-status/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    
    // 获取视频信息
    const [videos] = await pool.execute(
      'SELECT video_url, cover_url, mpd_path, transcode_status, transcode_task_id FROM post_videos WHERE post_id = ?',
      [postId]
    );
    
    if (videos.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '视频不存在'
      });
    }
    
    const video = videos[0];
    let taskStatus = null;
    
    // 如果有转码任务ID，获取任务状态
    if (video.transcode_task_id) {
      taskStatus = getJobStatus(video.transcode_task_id);
    }
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        video_url: video.video_url,
        cover_url: video.cover_url,
        mpd_path: video.mpd_path,
        transcode_status: video.transcode_status,
        transcode_task_id: video.transcode_task_id,
        task_progress: taskStatus?.progress || null,
        task_status: taskStatus?.status || null
      }
    });
  } catch (error) {
    console.error('获取视频转码状态失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取视频转码状态失败'
    });
  }
});

/**
 * 获取转码队列状态
 * GET /api/video/transcode-queue
 */
router.get('/transcode-queue', authenticateToken, async (req, res) => {
  try {
    const queueStatus = getQueueStatus();
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: queueStatus
    });
  } catch (error) {
    console.error('获取转码队列状态失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取转码队列状态失败'
    });
  }
});

/**
 * 更新视频MPD路径（内部使用，当转码完成时调用）
 * @param {number} postId - 帖子ID
 * @param {string} mpdPath - MPD文件路径
 * @param {string} status - 转码状态
 */
async function updateVideoMpdPath(postId, mpdPath, status = 'completed') {
  try {
    await pool.execute(
      'UPDATE post_videos SET mpd_path = ?, transcode_status = ? WHERE post_id = ?',
      [mpdPath, status, postId]
    );
    console.log(`视频MPD路径已更新 - postId: ${postId}, mpdPath: ${mpdPath}`);
    return true;
  } catch (error) {
    console.error('更新视频MPD路径失败:', error);
    return false;
  }
}

/**
 * 更新视频转码状态
 * @param {number} postId - 帖子ID
 * @param {string} status - 转码状态
 * @param {string} taskId - 任务ID（可选）
 */
async function updateTranscodeStatus(postId, status, taskId = null) {
  try {
    if (taskId) {
      await pool.execute(
        'UPDATE post_videos SET transcode_status = ?, transcode_task_id = ? WHERE post_id = ?',
        [status, taskId, postId]
      );
    } else {
      await pool.execute(
        'UPDATE post_videos SET transcode_status = ? WHERE post_id = ?',
        [status, postId]
      );
    }
    return true;
  } catch (error) {
    console.error('更新转码状态失败:', error);
    return false;
  }
}

// 监听转码完成事件，自动更新数据库
transcodeQueue.on('jobCompleted', async (job) => {
  try {
    if (job.result && job.result.success && job.result.data && job.result.data.mpdPath) {
      // 从任务中获取postId
      if (job.postId) {
        const mpdRelativePath = path.relative(process.cwd(), job.result.data.mpdPath).replace(/\\/g, '/');
        const success = await updateVideoMpdPath(job.postId, '/' + mpdRelativePath, 'completed');
        if (!success) {
          console.error(`更新MPD路径失败 - postId: ${job.postId}`);
        }
      }
    } else if (job.postId) {
      const success = await updateTranscodeStatus(job.postId, 'failed');
      if (!success) {
        console.error(`更新转码状态失败 - postId: ${job.postId}`);
      }
    }
  } catch (error) {
    console.error('处理转码完成事件失败:', error);
  }
});

transcodeQueue.on('jobStarted', async (job) => {
  try {
    if (job.postId) {
      await updateTranscodeStatus(job.postId, 'processing', job.taskId);
    }
  } catch (error) {
    console.error('处理转码开始事件失败:', error);
  }
});

module.exports = router;
module.exports.updateVideoMpdPath = updateVideoMpdPath;
module.exports.updateTranscodeStatus = updateTranscodeStatus;
