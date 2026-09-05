import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { challengeManager } from '../orchestrator/challengeManager.js';
import { awardCommunityScore } from '../services/communityService.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.title, c.category, c.difficulty, c.points, c.description,
        c.challenge_type, c.hints, c.file_attachments,
        COALESCE(uc.status, 'available') as status,
        uc.instance_port, uc.container_id
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
      ORDER BY c.difficulty, c.category`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT c.*, 
        COALESCE(uc.status, 'available') as status,
        uc.instance_port, uc.container_id, uc.last_started_at
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
      WHERE c.id = $2`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

router.post('/:id/start', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await challengeManager.startChallenge(req.userId!, id);

    if (!result) {
      return res.status(500).json({ error: 'Failed to start challenge' });
    }

    res.json(result);
  } catch (error) {
    console.error('Start challenge error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/:id/stop', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const success = await challengeManager.stopChallenge(req.userId!, id);

    res.json({ success });
  } catch (error) {
    console.error('Stop challenge error:', error);
    res.status(500).json({ error: 'Failed to stop challenge' });
  }
});

router.post('/:id/reset', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await challengeManager.resetChallenge(req.userId!, id);

    if (!result) {
      return res.status(500).json({ error: 'Failed to reset challenge' });
    }

    res.json(result);
  } catch (error) {
    console.error('Reset challenge error:', error);
    res.status(500).json({ error: 'Failed to reset challenge' });
  }
});

router.get('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const status = await challengeManager.getChallengeStatus(req.userId!, id);

    res.json(status);
  } catch (error) {
    console.error('Get challenge status error:', error);
    res.status(500).json({ error: 'Failed to get challenge status' });
  }
});

router.post('/:id/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { flag } = req.body;

    const challengeResult = await query(
      'SELECT * FROM challenges WHERE id = $1',
      [id]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const challenge = challengeResult.rows[0];

    if (challenge.flag !== flag) {
      return res.status(400).json({ error: 'Incorrect flag' });
    }

    const existingProgress = await query(
      'SELECT status FROM user_challenges WHERE user_id = $1 AND challenge_id = $2',
      [req.userId, id]
    );

    if (existingProgress.rows.length > 0 && existingProgress.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Challenge already completed' });
    }

    await query(
      `INSERT INTO user_challenges (user_id, challenge_id, status, completed_at)
       VALUES ($1, $2, 'completed', CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, challenge_id) 
       DO UPDATE SET status = 'completed', completed_at = CURRENT_TIMESTAMP`,
      [req.userId, id]
    );

    await query(
      `UPDATE user_stats SET
        challenges_solved = challenges_solved + 1,
        total_points = total_points + $1,
        xp = xp + $2,
        level = FLOOR((xp + $2) / 1000) + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3`,
      [challenge.points, challenge.points, req.userId]
    );

    // Recalculate global rank based on total_points
    await query(
      `UPDATE user_stats SET
        global_rank = (
          SELECT COUNT(*) + 1
          FROM user_stats
          WHERE total_points > (
            SELECT total_points FROM user_stats WHERE user_id = $1
          )
        )
      WHERE user_id = $1`,
      [req.userId]
    );

    await awardCommunityScore(req.userId!, challenge.points);

    res.json({ success: true, points: challenge.points });
  } catch (error) {
    console.error('Submit challenge error:', error);
    res.status(500).json({ error: 'Failed to submit challenge' });
  }
});

export default router;
