/**
 * communities.ts  –  /api/communities
 *
 * All routes require a valid JWT (the `authenticate` middleware).
 * Only logged-in users can create, browse, or interact with communities.
 *
 * Route map:
 *  GET    /                        – list all communities (with member count & avg score)
 *  POST   /                        – create a new community (caller becomes leader)
 *  GET    /:id                     – get one community detail + ranked member list
 *  POST   /:id/join                – send a join request (status = pending)
 *  GET    /:id/requests            – leader only: list pending join requests
 *  PATCH  /:id/requests/:userId    – leader only: approve or reject a request
 *  PATCH  /:id/transfer-leadership – leader only: give leadership to another member
 *  DELETE /:id                     – leader only: delete the community
 *  DELETE /:id/members/:userId     – leader only: remove a member
 *  DELETE /:id/leave               – approved member leaves the community
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { updateCommunityAvgScore } from '../services/communityService.js';

const router = Router();

// All community routes require authentication
router.use(authenticate);

// ─── Validation schemas ────────────────────────────────────────────────────

const createCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional().default(true),
  max_members: z.number().int().min(2).max(200).optional().default(50),
});

const respondToRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

const transferLeadershipSchema = z.object({
  new_leader_id: z.string(),
});

// ─── Helper: assert caller is the community leader ─────────────────────────

async function assertLeader(communityId: string, userId: string) {
  const res = await query(
    `SELECT leader_id FROM communities WHERE id = $1`,
    [communityId]
  );
  if (res.rows.length === 0) throw new AppError(404, 'Community not found');
  if (res.rows[0].leader_id !== userId) throw new AppError(403, 'Only the leader can do this');
  return res.rows[0];
}

// ─── GET /  –  list all communities ───────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT
         c.id,
         c.name,
         c.description,
         c.is_public,
         c.avg_score,
         c.max_members,
         c.created_at,
         COALESCE(u.username, u.full_name, split_part(u.email, '@', 1)) AS leader_username,
         u.avatar   AS leader_avatar,
         COUNT(cm.user_id) FILTER (WHERE cm.status = 'approved') AS member_count
       FROM communities c
       LEFT JOIN users u ON u.id = c.leader_id
       LEFT JOIN community_members cm ON cm.community_id = c.id
       GROUP BY c.id, u.username, u.full_name, u.email, u.avatar
       ORDER BY c.avg_score DESC, c.created_at DESC`
    );
    res.json({ communities: result.rows });
  })
);

// ─── POST /  –  create a community ────────────────────────────────────────

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = createCommunitySchema.parse(req.body);
    const userId = req.userId!;

    // Create community; creator is immediately the leader and an approved member
    const comResult = await query(
      `INSERT INTO communities (name, description, created_by, leader_id, is_public, max_members)
       VALUES ($1, $2, $3, $3, $4, $5)
       RETURNING *`,
      [body.name, body.description ?? null, userId, body.is_public, body.max_members]
    );
    const community = comResult.rows[0];

    // Insert creator as approved member with their existing points as community_score
    await query(
      `INSERT INTO community_members (community_id, user_id, role, status, joined_at, community_score)
       VALUES ($1, $2, 'leader', 'approved', NOW(),
         (SELECT total_points FROM user_stats WHERE user_id = $2)
       )`,
      [community.id, userId]
    );

    await updateCommunityAvgScore(community.id);

    res.status(201).json({ community });
  })
);

// ─── GET /leading/pending-count – total pending join requests across ──────
// ─── every community the caller leads (drives the navbar badge) ──────────

router.get(
  '/leading/pending-count',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT COUNT(*) FROM community_members cm
       JOIN communities c ON c.id = cm.community_id
       WHERE c.leader_id = $1 AND cm.status = 'pending'`,
      [req.userId]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  })
);

// ─── GET /:id  –  community detail with ranked members ────────────────────

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    // Community info
    const comRes = await query(
      `SELECT
          c.*,
          COALESCE(u.username, u.full_name, split_part(u.email, '@', 1)) AS leader_username,
          u.avatar AS leader_avatar,
          COUNT(cm.user_id) FILTER (WHERE cm.status = 'approved') AS member_count
       FROM communities c
       LEFT JOIN users u
         ON u.id = c.leader_id
       LEFT JOIN community_members cm
         ON cm.community_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.username, u.full_name, u.email, u.avatar`,
      [id]
    );
    if (comRes.rows.length === 0) throw new AppError(404, 'Community not found');

    // Approved members ranked by community_score DESC
    const membersRes = await query(
      `SELECT
         u.id,
         COALESCE(u.username, u.full_name, split_part(u.email, '@', 1)) AS username,
         u.avatar,
         u.experience_level,
         cm.role,
         cm.community_score,
         cm.joined_at,
         RANK() OVER (ORDER BY cm.community_score DESC) AS rank
       FROM community_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'approved'
       ORDER BY cm.community_score DESC`,
      [id]
    );

    // Caller's own membership status (pending/approved/rejected/left), if any
    const myStatusRes = await query(
      `SELECT status FROM community_members WHERE community_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({
      community: comRes.rows[0],
      members: membersRes.rows,
      my_status: myStatusRes.rows[0]?.status ?? null,
    });
  })
);

// ─── POST /:id/join  –  send a join request ────────────────────────────────

router.post(
  '/:id/join',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    // Community must exist
    const comRes = await query(
      `SELECT id, max_members, is_public FROM communities WHERE id = $1`,
      [id]
    );
    if (comRes.rows.length === 0) throw new AppError(404, 'Community not found');

    // Check max members
    const countRes = await query(
      `SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND status = 'approved'`,
      [id]
    );
    if (parseInt(countRes.rows[0].count) >= comRes.rows[0].max_members) {
      throw new AppError(400, 'Community is full');
    }

    // Check for existing membership row
    const existing = await query(
      `SELECT status FROM community_members WHERE community_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0].status;
      if (s === 'approved') throw new AppError(400, 'You are already a member');
      if (s === 'pending')  throw new AppError(400, 'Your request is already pending');

      // If previously rejected or left, allow re-requesting
      const newStatus = comRes.rows[0].is_public ? 'approved' : 'pending';
      await query(
        `UPDATE community_members
         SET status = $1, requested_at = NOW(),
         joined_at = ${comRes.rows[0].is_public ? 'NOW()' : 'NULL'}
         WHERE community_id = $2 AND user_id = $3`,
        [newStatus, id, userId]
      );

      // If public, seed community score immediately
      if (comRes.rows[0].is_public) {
        await query(
          `UPDATE community_members
           SET community_score = (
             SELECT COALESCE(total_points, 0) FROM user_stats WHERE user_id = $1
           )
           WHERE community_id = $2 AND user_id = $1`,
          [userId, id]
        );
        await updateCommunityAvgScore(id);
      }

      return res.json({
        message: comRes.rows[0].is_public
          ? 'Joined community successfully'
          : 'Join request re-sent'
      });
    }

    // Public community → approve immediately
    // Private community → set as pending
    if (comRes.rows[0].is_public) {
      await query(
        `INSERT INTO community_members
         (community_id, user_id, role, status, joined_at, community_score)
         VALUES ($1, $2, 'member', 'approved', NOW(),
           (SELECT COALESCE(total_points, 0) FROM user_stats WHERE user_id = $2)
         )`,
        [id, userId]
      );
      await updateCommunityAvgScore(id);
      return res.status(201).json({ message: 'Joined community successfully' });
    } else {
      await query(
        `INSERT INTO community_members (community_id, user_id, role, status)
         VALUES ($1, $2, 'member', 'pending')`,
        [id, userId]
      );
      return res.status(201).json({ message: 'Join request sent. Waiting for leader approval.' });
    }
  })
);

// ─── GET /:id/requests  –  leader: list pending requests ──────────────────

router.get(
  '/:id/requests',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await assertLeader(id, req.userId!);

    const result = await query(
      `SELECT u.id, COALESCE(u.username, u.full_name, split_part(u.email, '@', 1)) AS username,
              u.avatar, u.experience_level, cm.requested_at
       FROM community_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.community_id = $1 AND cm.status = 'pending'
       ORDER BY cm.requested_at ASC`,
      [id]
    );

    res.json({ requests: result.rows });
  })
);

// ─── PATCH /:id/requests/:userId  –  leader: approve or reject ────────────

router.patch(
  '/:id/requests/:userId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId: targetUserId } = req.params;
    await assertLeader(id, req.userId!);

    const { action } = respondToRequestSchema.parse(req.body);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const joinedAt  = action === 'approve' ? 'NOW()' : 'NULL';

    const result = await query(
      `UPDATE community_members
       SET status = $1, joined_at = ${joinedAt}
       WHERE community_id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING *`,
      [newStatus, id, targetUserId]
    );
    if (result.rows.length === 0) throw new AppError(404, 'No pending request found for that user');

    // If approved, seed community_score from their existing total_points
    if (action === 'approve') {
      await query(
        `UPDATE community_members
         SET community_score = (
           SELECT total_points FROM user_stats WHERE user_id = $1
         )
         WHERE community_id = $2 AND user_id = $1`,
        [targetUserId, id]
      );
      await updateCommunityAvgScore(id);
    }

    res.json({ message: `Request ${action}d`});
  })
);

// ─── PATCH /:id/transfer-leadership  –  leader gives leadership away ───────

router.patch(
  '/:id/transfer-leadership',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await assertLeader(id, req.userId!);

    const { new_leader_id } = transferLeadershipSchema.parse(req.body);

    // New leader must be an approved member
    const memberCheck = await query(
      `SELECT user_id FROM community_members
       WHERE community_id = $1 AND user_id = $2 AND status = 'approved'`,
      [id, new_leader_id]
    );
    if (memberCheck.rows.length === 0) {
      throw new AppError(400, 'Target user is not an approved member of this community');
    }

    // Demote old leader → member, promote new leader → leader
    await query(
      `UPDATE community_members SET role = 'member'
       WHERE community_id = $1 AND user_id = $2`,
      [id, req.userId!]
    );
    await query(
      `UPDATE community_members SET role = 'leader'
       WHERE community_id = $1 AND user_id = $2`,
      [id, new_leader_id]
    );

    // Update communities table
    await query(
      `UPDATE communities SET leader_id = $1, updated_at = NOW() WHERE id = $2`,
      [new_leader_id, id]
    );

    res.json({ message: 'Leadership transferred successfully' });
  })
);

// ─── DELETE /:id  –  leader deletes the community ─────────────────────────

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await assertLeader(id, req.userId!);

    // Delete members first (foreign key constraint)
    await query(
      `DELETE FROM community_members WHERE community_id = $1`,
      [id]
    );

    // Delete the community
    await query(
      `DELETE FROM communities WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Community deleted successfully' });
  })
);

// ─── DELETE /:id/members/:userId  –  leader removes a member ──────────────

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId: targetUserId } = req.params;
    await assertLeader(id, req.userId!);

    // Cannot remove yourself (leader)
    if (targetUserId === req.userId) {
      throw new AppError(400, 'You cannot remove yourself. Transfer leadership first.');
    }

    // Check member exists and is approved
    const memberCheck = await query(
      `SELECT user_id FROM community_members
       WHERE community_id = $1 AND user_id = $2 AND status = 'approved'`,
      [id, targetUserId]
    );
    if (memberCheck.rows.length === 0) {
      throw new AppError(404, 'Member not found in this community');
    }

    // Set status to left
    await query(
      `UPDATE community_members SET status = 'left'
       WHERE community_id = $1 AND user_id = $2`,
      [id, targetUserId]
    );

    // Recalculate avg score after member removed
    await updateCommunityAvgScore(id);

    res.json({ message: 'Member removed successfully' });
  })
);

// ─── DELETE /:id/leave  –  member leaves the community ────────────────────

router.delete(
  '/:id/leave',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    // Leader cannot leave without transferring leadership first
    const comRes = await query(`SELECT leader_id FROM communities WHERE id = $1`, [id]);
    if (comRes.rows.length === 0) throw new AppError(404, 'Community not found');
    if (comRes.rows[0].leader_id === userId) {
      throw new AppError(400, 'Transfer leadership before leaving');
    }

    await query(
      `UPDATE community_members SET status = 'left'
       WHERE community_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ message: 'You have left the community' });
  })
);

export default router;
