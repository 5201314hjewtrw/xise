-- ============================================
-- 添加全部隐藏开关字段
-- 用于在付费设置中添加hide_all列
-- ============================================

-- 在 post_payment_settings 表中添加 hide_all 字段
ALTER TABLE `post_payment_settings` 
ADD COLUMN `hide_all` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否全部隐藏内容（仅隐藏内容文字，不隐藏标题）' AFTER `preview_duration`;

-- 完成
SELECT '添加 hide_all 字段完成！' AS message;
