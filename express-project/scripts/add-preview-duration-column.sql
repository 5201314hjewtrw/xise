-- ============================================
-- 添加视频预览时长字段
-- 用于存储付费视频的免费预览秒数
-- ============================================

-- 添加 preview_duration 列到 post_payment_settings 表
ALTER TABLE `post_payment_settings` 
ADD COLUMN `preview_duration` int(11) NOT NULL DEFAULT 0 COMMENT '视频预览时长（秒）' AFTER `free_preview_count`;

-- 完成
SELECT '视频预览时长字段添加完成！' AS message;
