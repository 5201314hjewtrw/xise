-- 添加昵称可见性字段
-- 用于控制注册后昵称是否对外可见，审核通过后设为true

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname_visible BOOLEAN DEFAULT FALSE;

-- 将现有用户的昵称设为可见（向后兼容）
UPDATE users SET nickname_visible = TRUE WHERE nickname_visible IS NULL OR nickname_visible = FALSE;
