/**
 * communityService.ts
 *
 * Business logic that sits between the routes and the database.
 *
 * Key responsibility:
 *   When a user solves a challenge, call `awardCommunityScore(userId, points)`.
 *   This adds the challenge points to every community where the user is an
 *   approved member, then recalculates that community's average score.
 */

import { query } from '../db/index.js';
import { logger } from '../utils/logger.js';

/**
 * Recalculate and persist a community's avg_score.
 * avg_score = average of community_score across all approved members.
 */
export async function updateCommunityAvgScore(communityId: string): Promise<void> {
  await query(
    `UPDATE communities
     SET avg_score = (
       SELECT COALESCE(SUM(community_score), 0)
       FROM community_members
       WHERE community_id = $1 AND status = 'approved'
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [communityId]
  );
}

/**
 * Called whenever a user completes a challenge and earns points.
 * Adds `points` to every community the user actively belongs to,
 * then updates those communities' average scores.
 *
 * @param userId  - the user who solved the challenge
 * @param points  - how many points the challenge was worth
 */
export async function awardCommunityScore(userId: string, points: number): Promise<void> {
  try {
    // Find all communities where this user is an approved member
    const communityRes = await query(
      `SELECT community_id FROM community_members
       WHERE user_id = $1 AND status = 'approved'`,
      [userId]
    );

    if (communityRes.rows.length === 0) return; // user isn't in any community

    for (const row of communityRes.rows) {
      const communityId: string = row.community_id;

      // Add challenge points to this member's community_score
      await query(
        `UPDATE community_members
         SET community_score = community_score + $1
         WHERE community_id = $2 AND user_id = $3`,
        [points, communityId, userId]
      );

      // Recalculate the whole community's average
      await updateCommunityAvgScore(communityId);
    }

    logger.info('Community scores updated', { userId, points });
  } catch (err) {
    // Non-fatal: log and continue so challenge submission still succeeds
    logger.error('Failed to update community scores', err);
  }
}
