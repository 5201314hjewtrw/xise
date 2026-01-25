/**
 * 活动奖励服务
 * 处理活动目标检测和奖励发放
 */

const prisma = require('./prisma');

/**
 * 检查并发放活动奖励
 * @param {BigInt} userId - 用户ID
 * @param {BigInt} postId - 笔记ID (可选)
 * @returns {Promise<{rewarded: boolean, amount: number, activityName: string}[]>}
 */
async function checkAndDistributeActivityRewards(userId, postId = null) {
  const results = [];
  
  try {
    const userIdBigInt = BigInt(userId);
    
    // 获取用户所有未完成奖励的活动参与记录，包含活动标签
    const participations = await prisma.activityParticipation.findMany({
      where: {
        user_id: userIdBigInt,
        is_completed: false,
        is_rewarded: false
      },
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
      }
    });
    
    if (participations.length === 0) {
      return results;
    }
    
    // 获取用户所有帖子的统计数据
    const userPosts = await prisma.post.findMany({
      where: {
        user_id: userIdBigInt,
        is_draft: false
      },
      select: {
        id: true,
        like_count: true,
        comment_count: true,
        collect_count: true,
        view_count: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    for (const participation of participations) {
      const activity = participation.activity;
      
      // 检查活动是否仍在进行中
      const now = new Date();
      if (activity.status !== 'active' || activity.end_time < now) {
        continue;
      }
      
      // 获取活动关联的标签（已通过include预加载）
      const activityTagNames = activity.tags.map(at => at.tag.name);
      
      // 统计用户在活动相关标签下的帖子数据
      let totalLikes = 0;
      let totalComments = 0;
      let totalCollections = 0;
      let totalViews = 0;
      
      for (const post of userPosts) {
        // 检查帖子是否包含活动标签
        const postTagNames = post.tags.map(pt => pt.tag.name);
        const hasActivityTag = activityTagNames.length === 0 || 
          activityTagNames.some(tagName => postTagNames.includes(tagName));
        
        if (hasActivityTag) {
          totalLikes += post.like_count || 0;
          totalComments += post.comment_count || 0;
          totalCollections += post.collect_count || 0;
          totalViews += post.view_count || 0;
        }
      }
      
      // 更新参与记录的统计数据
      await prisma.activityParticipation.update({
        where: { id: participation.id },
        data: {
          likes_count: totalLikes,
          comments_count: totalComments,
          collections_count: totalCollections,
          views_count: totalViews
        }
      });
      
      // 检查是否达到目标
      const targetsReached = (
        (activity.target_likes === 0 || totalLikes >= activity.target_likes) &&
        (activity.target_comments === 0 || totalComments >= activity.target_comments) &&
        (activity.target_collections === 0 || totalCollections >= activity.target_collections) &&
        (activity.target_views === 0 || totalViews >= activity.target_views)
      );
      
      // 需要至少有一个非零目标
      const hasAnyTarget = activity.target_likes > 0 || 
        activity.target_comments > 0 || 
        activity.target_collections > 0 || 
        activity.target_views > 0;
      
      if (targetsReached && hasAnyTarget) {
        // 标记为已完成
        await prisma.activityParticipation.update({
          where: { id: participation.id },
          data: { is_completed: true }
        });
        
        // 发放奖励
        if (activity.reward_amount && parseFloat(activity.reward_amount) > 0) {
          const rewardAmount = parseFloat(activity.reward_amount);
          
          // 获取或创建收益账户
          let earnings = await prisma.creatorEarnings.findUnique({
            where: { user_id: userIdBigInt }
          });
          
          if (!earnings) {
            earnings = await prisma.creatorEarnings.create({
              data: {
                user_id: userIdBigInt,
                balance: 0.00,
                total_earnings: 0.00,
                withdrawn_amount: 0.00
              }
            });
          }
          
          const newBalance = parseFloat(earnings.balance) + rewardAmount;
          const newTotalEarnings = parseFloat(earnings.total_earnings) + rewardAmount;
          
          // 更新收益余额
          await prisma.creatorEarnings.update({
            where: { user_id: userIdBigInt },
            data: {
              balance: newBalance,
              total_earnings: newTotalEarnings
            }
          });
          
          // 记录收益日志
          await prisma.creatorEarningsLog.create({
            data: {
              user_id: userIdBigInt,
              earnings_id: earnings.id,
              amount: rewardAmount,
              balance_after: newBalance,
              type: 'activity_reward',
              source_id: activity.id,
              source_type: 'activity',
              reason: `活动奖励: ${activity.name}`,
              platform_fee: 0
            }
          });
          
          // 标记为已发放奖励
          await prisma.activityParticipation.update({
            where: { id: participation.id },
            data: { is_rewarded: true }
          });
          
          results.push({
            rewarded: true,
            amount: rewardAmount,
            activityName: activity.name,
            activityId: Number(activity.id)
          });
          
          console.log(`✅ 活动奖励已发放: 用户${userId}, 活动"${activity.name}", 金额${rewardAmount}`);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('检查活动奖励失败:', error);
    return results;
  }
}

/**
 * 批量检查所有用户的活动奖励 (定时任务使用)
 */
async function checkAllUsersActivityRewards() {
  try {
    // 获取所有有未完成活动参与的用户
    const participations = await prisma.activityParticipation.findMany({
      where: {
        is_completed: false,
        is_rewarded: false,
        activity: {
          status: 'active',
          end_time: { gte: new Date() }
        }
      },
      select: {
        user_id: true
      },
      distinct: ['user_id']
    });
    
    const userIds = [...new Set(participations.map(p => p.user_id))];
    
    console.log(`🔍 检查 ${userIds.length} 个用户的活动奖励...`);
    
    // 并发处理，每批5个用户
    const BATCH_SIZE = 5;
    let totalRewarded = 0;
    
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(userId => checkAndDistributeActivityRewards(userId))
      );
      totalRewarded += batchResults.flat().filter(r => r.rewarded).length;
    }
    
    console.log(`✅ 活动奖励检查完成，共发放 ${totalRewarded} 个奖励`);
    return totalRewarded;
  } catch (error) {
    console.error('批量检查活动奖励失败:', error);
    return 0;
  }
}

module.exports = {
  checkAndDistributeActivityRewards,
  checkAllUsersActivityRewards
};
