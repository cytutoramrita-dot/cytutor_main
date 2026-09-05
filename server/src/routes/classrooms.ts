import { Router, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { query } from '../db/index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  return 'CYT-' + randomBytes(3).toString('hex').toUpperCase();
}

// ─── Classroom challenge file uploads ─────────────────────────────────────────
// Stored on local disk under server/uploads/classroom-challenges/<classroomId>/
// and served statically at /uploads (mounted in app.ts).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, '../../uploads/classroom-challenges');

const uploadStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${randomBytes(8).toString('hex')}${ext}`);
  },
});

// Combined cap for a single upload batch — a lone file may use the whole
// budget, but multiple files must share it (enforced again below since
// multer's fileSize limit only bounds each file individually).
const MAX_TOTAL_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const uploadChallengeFiles = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_TOTAL_UPLOAD_BYTES, files: 5 },
});

// Wraps multer so oversized/too-many-file uploads return a clear JSON
// warning instead of falling through to the generic 500 error handler.
function uploadFilesMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  uploadChallengeFiles.array('files', 5)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Each file must be 5MB or smaller.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'You can upload at most 5 files at a time.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: 'File upload failed' });
    }
    next();
  });
}

// Runs before multer so unauthorized requests never get a chance to write to disk
async function requireMentorOfParam(req: AuthRequest, res: Response, next: NextFunction) {
  if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
    return res.status(403).json({ error: 'Not your classroom' });
  }
  next();
}

// Best available display name for a user row — falls back to the email's
// local-part (not the full address) when onboarding hasn't set a name yet
function displayName(user: { full_name?: string | null; username?: string | null; email: string }): string {
  return user.full_name || user.username || user.email.split('@')[0];
}

function requireAdmin(req: AuthRequest, res: Response): boolean {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// Only the classroom's own mentor_id or a platform admin can manage it
async function isMentorOf(classroomId: string, userId: string, userRole?: string): Promise<boolean> {
  if (userRole === 'admin') return true;
  const r = await query(
    'SELECT 1 FROM classrooms WHERE id = $1 AND mentor_id = $2',
    [classroomId, userId]
  );
  return r.rows.length > 0;
}

// Only count members with an approved join request
async function isMember(classroomId: string, userId: string): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM classroom_members
     WHERE classroom_id = $1 AND user_id = $2 AND join_status = 'approved'`,
    [classroomId, userId]
  );
  return r.rows.length > 0;
}

async function canAccessClassroom(classroomId: string, userId: string, userRole?: string): Promise<boolean> {
  return (await isMentorOf(classroomId, userId, userRole)) || (await isMember(classroomId, userId));
}

// ─── Classrooms ──────────────────────────────────────────────────────────────

// POST /classrooms — any authenticated user can request a classroom
// Classroom starts as pending (is_active=FALSE) until an admin approves it
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

    const inviteCode = generateInviteCode();
    const result = await query(
      `INSERT INTO classrooms (name, description, mentor_id, invite_code, is_active, approval_status)
       VALUES ($1, $2, $3, $4, FALSE, 'pending') RETURNING *`,
      [name.trim(), description ?? null, req.user!.id, inviteCode]
    );
    res.status(201).json(result.rows[0]);

    // Notify all admins — fire-and-forget, does not affect the response
    const classroomsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/classrooms`;
    Promise.all([
      query(`SELECT email, full_name FROM users WHERE role = 'admin'`),
      query(`SELECT email, full_name, username FROM users WHERE id = $1`, [req.user!.id]),
    ]).then(([admins, requesterRes]) => {
      const r = requesterRes.rows[0];
      const requesterLine = r
        ? `Requested by: ${displayName(r)} (${r.email}) [User ID: ${req.user!.id}]`
        : `Requested by: [User ID: ${req.user!.id}]`;
      const body = [
        `A new classroom request is awaiting your approval.`,
        ``,
        requesterLine,
        `Classroom: "${name.trim()}"`,
        description ? `Description: ${description}` : null,
        ``,
        `Review and approve it here:`,
        classroomsUrl,
      ].filter(l => l !== null).join('\n');

      for (const admin of admins.rows) {
        sendEmail(admin.email, `[CyTutor] New Classroom Request: "${name.trim()}"`, body)
          .catch(e => console.error('Admin notification email failed:', e));
      }
    }).catch(e => console.error('Failed to send admin notification:', e));
  } catch (err) {
    console.error('Create classroom error:', err);
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

// GET /classrooms/pending — admin only: list classrooms awaiting approval
// Must be before /:id routes
router.get('/pending', authenticate, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `SELECT c.*, u.full_name AS creator_name, u.email AS creator_email
       FROM classrooms c
       JOIN users u ON u.id = c.mentor_id
       WHERE c.approval_status = 'pending'
       ORDER BY c.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get pending classrooms error:', err);
    res.status(500).json({ error: 'Failed to fetch pending classrooms' });
  }
});

// GET /classrooms/my — classrooms where user is creator OR has a join request
// Must be before /:id routes
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    // Classrooms user created — any approval status, but excludes ones the
    // mentor already deleted (deactivated after being approved)
    const ownedResult = await query(
      `SELECT c.*,
        COUNT(cm.user_id) FILTER (WHERE cm.join_status = 'approved')::int AS member_count,
        'owner' AS my_relation
       FROM classrooms c
       LEFT JOIN classroom_members cm ON cm.classroom_id = c.id
       WHERE c.mentor_id = $1 AND (c.is_active = TRUE OR c.approval_status != 'approved')
       GROUP BY c.id ORDER BY c.created_at DESC`,
      [req.user!.id]
    );

    // Classrooms user has a join request for (any join_status), on active classrooms
    const joinedResult = await query(
      `SELECT c.*, u.full_name AS mentor_name, cm.join_status,
        COUNT(cm2.user_id) FILTER (WHERE cm2.join_status = 'approved')::int AS member_count,
        'member' AS my_relation
       FROM classrooms c
       JOIN classroom_members cm ON cm.classroom_id = c.id AND cm.user_id = $1
       JOIN users u ON u.id = c.mentor_id
       LEFT JOIN classroom_members cm2 ON cm2.classroom_id = c.id
       WHERE c.is_active = TRUE
       GROUP BY c.id, u.full_name, cm.join_status, cm.joined_at
       ORDER BY cm.joined_at DESC`,
      [req.user!.id]
    );

    // Deduplicate (user could be member of their own classroom, unlikely but safe)
    const ownedIds = new Set(ownedResult.rows.map((r: any) => r.id));
    const combined = [
      ...ownedResult.rows,
      ...joinedResult.rows.filter((r: any) => !ownedIds.has(r.id)),
    ];

    res.json(combined);
  } catch (err) {
    console.error('Get my classrooms error:', err);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

// GET /classrooms/my/assignments — all assignments across student's classrooms
// Must be registered before /:id routes
router.get('/my/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT a.*,
        cl.name AS classroom_name,
        c.title  AS challenge_title,  c.difficulty AS challenge_difficulty,
        c.points AS challenge_points, c.category   AS challenge_category,
        cc.title  AS cc_title,  cc.difficulty AS cc_difficulty,
        cc.points AS cc_points, cc.category   AS cc_category,
        sub.is_correct, sub.attempts, sub.submitted_at
       FROM assignments a
       JOIN classrooms cl ON cl.id = a.classroom_id
       JOIN classroom_members cm ON cm.classroom_id = a.classroom_id AND cm.user_id = $1
         AND cm.join_status = 'approved'
       LEFT JOIN challenges c  ON c.id  = a.global_challenge_id
       LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.user_id = $1
       WHERE a.is_active = TRUE AND cl.is_active = TRUE
       ORDER BY a.due_date ASC NULLS LAST, a.assigned_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get my assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /classrooms/assignments/:aId — fetch a single assignment (approved member only)
router.get('/assignments/:aId', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT a.*,
        cl.name AS classroom_name,
        c.title AS challenge_title, c.description AS challenge_description,
        c.difficulty AS challenge_difficulty, c.points AS challenge_points,
        c.category AS challenge_category, c.hints AS challenge_hints,
        c.file_attachments AS challenge_file_attachments,
        cc.title AS cc_title, cc.description AS cc_description,
        cc.difficulty AS cc_difficulty, cc.points AS cc_points,
        cc.category AS cc_category, cc.hints AS cc_hints,
        cc.file_attachments AS cc_file_attachments,
        sub.is_correct, sub.attempts, sub.submitted_at
       FROM assignments a
       JOIN classrooms cl ON cl.id = a.classroom_id
       LEFT JOIN challenges c ON c.id = a.global_challenge_id
       LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.user_id = $2
       WHERE a.id = $1 AND a.is_active = TRUE`,
      [req.params.aId, req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = result.rows[0];
    if (!await canAccessClassroom(assignment.classroom_id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not a member of this classroom' });
    }
    res.json(assignment);
  } catch (err) {
    console.error('Get assignment error:', err);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// POST /classrooms/join — request to join; creates a pending membership
router.post('/join', authenticate, async (req: AuthRequest, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'invite_code is required' });

    const classroom = await query(
      `SELECT * FROM classrooms WHERE invite_code = $1 AND is_active = TRUE`,
      [invite_code.trim().toUpperCase()]
    );
    if (classroom.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }

    const cr = classroom.rows[0];
    if (cr.mentor_id === req.user!.id) {
      return res.status(400).json({ error: 'You are the mentor of this classroom' });
    }

    // Check for existing request
    const existing = await query(
      `SELECT join_status FROM classroom_members WHERE classroom_id = $1 AND user_id = $2`,
      [cr.id, req.user!.id]
    );
    if (existing.rows.length > 0) {
      const status = existing.rows[0].join_status;
      if (status === 'approved') return res.status(400).json({ error: 'Already a member' });
      if (status === 'pending') return res.status(400).json({ error: 'Join request already pending' });
      if (status === 'rejected') {
        // Allow re-request after rejection — reset to pending
        await query(
          `UPDATE classroom_members SET join_status = 'pending', approved_at = NULL
           WHERE classroom_id = $1 AND user_id = $2`,
          [cr.id, req.user!.id]
        );
        res.json({ success: true, status: 'pending', classroom: { id: cr.id, name: cr.name } });
        notifyMentorOfJoinRequest(cr, req.user!.id);
        return;
      }
    }

    await query(
      `INSERT INTO classroom_members (classroom_id, user_id, join_status)
       VALUES ($1, $2, 'pending')`,
      [cr.id, req.user!.id]
    );
    res.json({ success: true, status: 'pending', classroom: { id: cr.id, name: cr.name } });
    notifyMentorOfJoinRequest(cr, req.user!.id);
  } catch (err) {
    console.error('Join classroom error:', err);
    res.status(500).json({ error: 'Failed to request to join classroom' });
  }
});

// Notify a classroom's mentor that a student has requested to join — fire-and-forget
function notifyMentorOfJoinRequest(classroom: { id: string; name: string; mentor_id: string }, requesterId: string): void {
  Promise.all([
    query(`SELECT email FROM users WHERE id = $1`, [classroom.mentor_id]),
    query(`SELECT email, full_name, username FROM users WHERE id = $1`, [requesterId]),
  ]).then(([mentorRes, requesterRes]) => {
    const mentor = mentorRes.rows[0];
    if (!mentor) return;
    const r = requesterRes.rows[0];
    const requesterLine = r
      ? `Requested by: ${displayName(r)} (${r.email})`
      : `Requested by: [User ID: ${requesterId}]`;
    const manageUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/classrooms/${classroom.id}/manage`;
    const body = [
      `A student has requested to join your classroom.`,
      ``,
      requesterLine,
      `Classroom: "${classroom.name}"`,
      ``,
      `Review and approve it here:`,
      manageUrl,
    ].join('\n');
    sendEmail(mentor.email, `[CyTutor] New Join Request: "${classroom.name}"`, body)
      .catch(e => console.error('Mentor notification email failed:', e));
  }).catch(e => console.error('Failed to send mentor notification:', e));
}

// ─── Admin: classroom approval ────────────────────────────────────────────────

// PATCH /classrooms/:id/approve — admin approves a pending classroom
router.patch('/:id/approve', authenticate, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `UPDATE classrooms SET is_active = TRUE, approval_status = 'approved'
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Classroom not found' });

    // Promote creator to mentor role if they are currently a student
    await query(
      `UPDATE users SET role = 'mentor'
       WHERE id = $1 AND role = 'student'`,
      [result.rows[0].mentor_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Approve classroom error:', err);
    res.status(500).json({ error: 'Failed to approve classroom' });
  }
});

// PATCH /classrooms/:id/reject — admin rejects a pending classroom
router.patch('/:id/reject', authenticate, async (req: AuthRequest, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await query(
      `UPDATE classrooms SET is_active = FALSE, approval_status = 'rejected'
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Classroom not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reject classroom error:', err);
    res.status(500).json({ error: 'Failed to reject classroom' });
  }
});

// GET /classrooms/:id — classroom detail (mentor/admin or approved member)
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await canAccessClassroom(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not a member of this classroom' });
    }
    const result = await query(
      `SELECT c.*, u.full_name AS mentor_name,
        (SELECT COUNT(*)::int FROM classroom_members
         WHERE classroom_id = c.id AND join_status = 'approved') AS member_count
       FROM classrooms c JOIN users u ON u.id = c.mentor_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Classroom not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get classroom error:', err);
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
});

// PATCH /classrooms/:id — update name/description (mentor/admin only)
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const { name, description } = req.body;
    const result = await query(
      `UPDATE classrooms SET
        name = COALESCE($1, name),
        description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [name ?? null, description ?? null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update classroom error:', err);
    res.status(500).json({ error: 'Failed to update classroom' });
  }
});

// DELETE /classrooms/:id — deactivate (mentor/admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    await query('UPDATE classrooms SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete classroom error:', err);
    res.status(500).json({ error: 'Failed to delete classroom' });
  }
});

// ─── Members ─────────────────────────────────────────────────────────────────

// GET /classrooms/:id/join-requests — pending join requests (mentor/admin only)
// Must be before /:id/members/:userId routes
router.get('/:id/join-requests', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `SELECT u.id AS user_id, u.full_name, u.username, u.email, u.avatar, cm.joined_at AS requested_at
       FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.classroom_id = $1 AND cm.join_status = 'pending'
       ORDER BY cm.joined_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get join requests error:', err);
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// GET /classrooms/:id/members — approved members only (mentor/admin only)
router.get('/:id/members', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `SELECT u.id, u.full_name, u.username, u.email, u.avatar,
        cm.joined_at, cm.approved_at,
        COALESCE(us.total_points, 0) AS total_points,
        COALESCE(us.challenges_solved, 0) AS challenges_solved,
        (
          SELECT COUNT(*)::int FROM assignment_submissions asub
          JOIN assignments a ON a.id = asub.assignment_id
          WHERE asub.user_id = u.id AND a.classroom_id = $1 AND asub.is_correct = TRUE
        ) AS assignments_completed
       FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN user_stats us ON us.user_id = u.id
       WHERE cm.classroom_id = $1 AND cm.join_status = 'approved'
       ORDER BY cm.joined_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// PATCH /classrooms/:id/members/:userId/approve — approve a join request
router.patch('/:id/members/:userId/approve', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `UPDATE classroom_members
       SET join_status = 'approved', approved_at = NOW()
       WHERE classroom_id = $1 AND user_id = $2 AND join_status = 'pending'
       RETURNING *`,
      [req.params.id, req.params.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Approve join request error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PATCH /classrooms/:id/members/:userId/reject — reject a join request
router.patch('/:id/members/:userId/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `UPDATE classroom_members
       SET join_status = 'rejected'
       WHERE classroom_id = $1 AND user_id = $2 AND join_status = 'pending'
       RETURNING *`,
      [req.params.id, req.params.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Reject join request error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// DELETE /classrooms/:id/members/:userId — remove an approved member (mentor/admin only)
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    await query(
      'DELETE FROM classroom_members WHERE classroom_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// POST /classrooms/:id/leave — a student removes themselves from a classroom
router.post('/:id/leave', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check the classroom's actual mentor_id directly — isMentorOf() also returns
    // true for any platform admin, which would wrongly block an admin who joined
    // someone else's classroom as a student from leaving it.
    const cr = await query('SELECT mentor_id FROM classrooms WHERE id = $1', [req.params.id]);
    if (cr.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    if (cr.rows[0].mentor_id === req.user!.id) {
      return res.status(400).json({ error: 'Mentors cannot leave their own classroom' });
    }
    const result = await query(
      `DELETE FROM classroom_members WHERE classroom_id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'You are not a member of this classroom' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Leave classroom error:', err);
    res.status(500).json({ error: 'Failed to leave classroom' });
  }
});

// ─── Classroom Challenges (mentor-authored) ───────────────────────────────────

// POST /classrooms/:id/challenges — create classroom-private challenge
router.post('/:id/challenges', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const { title, description, category, difficulty, points, challenge_type, flag, hints, file_attachments } = req.body;
    if (!title || !description || !category || !difficulty || !points || !challenge_type || !flag) {
      return res.status(400).json({ error: 'title, description, category, difficulty, points, challenge_type, and flag are required' });
    }
    if (!['description', 'downloadable'].includes(challenge_type)) {
      return res.status(400).json({ error: 'Only description and downloadable types are supported for classroom challenges' });
    }

    const id = `cc-${req.params.id.substring(0, 8)}-${randomBytes(4).toString('hex')}`;
    const result = await query(
      `INSERT INTO classroom_challenges
        (id, classroom_id, title, description, category, difficulty, points, challenge_type, flag, hints, file_attachments, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, req.params.id, title, description, category, difficulty, points, challenge_type, flag,
       hints ?? [], file_attachments ?? [], req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create classroom challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// POST /classrooms/:id/challenges/upload — upload downloadable-challenge files
// (mentor/admin only); returns absolute URLs to hand back to POST /:id/challenges
router.post(
  '/:id/challenges/upload',
  authenticate,
  requireMentorOfParam,
  uploadFilesMiddleware,
  (req: AuthRequest, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
      for (const f of files) fs.unlink(f.path, () => {});
      const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: `Combined file size (${totalMb}MB) exceeds the 5MB limit. Remove or shrink some files.`,
      });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = files.map(f => `${baseUrl}/uploads/classroom-challenges/${req.params.id}/${f.filename}`);
    res.status(201).json({ urls });
  }
);

// GET /classrooms/:id/challenges — list classroom challenges (approved members)
router.get('/:id/challenges', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await canAccessClassroom(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not a member of this classroom' });
    }
    const result = await query(
      `SELECT id, classroom_id, title, description, category, difficulty, points,
        challenge_type, hints, file_attachments, created_by, created_at
       FROM classroom_challenges WHERE classroom_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get classroom challenges error:', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// PATCH /classrooms/:id/challenges/:cId — edit challenge (mentor/admin only)
router.patch('/:id/challenges/:cId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const { title, description, category, difficulty, points, flag, hints, file_attachments } = req.body;
    const result = await query(
      `UPDATE classroom_challenges SET
        title            = COALESCE($1, title),
        description      = COALESCE($2, description),
        category         = COALESCE($3, category),
        difficulty       = COALESCE($4, difficulty),
        points           = COALESCE($5, points),
        flag             = COALESCE($6, flag),
        hints            = COALESCE($7, hints),
        file_attachments = COALESCE($8, file_attachments)
       WHERE id = $9 AND classroom_id = $10 RETURNING *`,
      [title ?? null, description ?? null, category ?? null, difficulty ?? null,
       points ?? null, flag ?? null, hints ?? null, file_attachments ?? null,
       req.params.cId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Challenge not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update classroom challenge error:', err);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

// DELETE /classrooms/:id/challenges/:cId (mentor/admin only)
router.delete('/:id/challenges/:cId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    await query(
      'DELETE FROM classroom_challenges WHERE id = $1 AND classroom_id = $2',
      [req.params.cId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete classroom challenge error:', err);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

// ─── Assignments ─────────────────────────────────────────────────────────────

// POST /classrooms/:id/assignments — create assignment (mentor/admin only)
router.post('/:id/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const { title, instructions, global_challenge_id, classroom_challenge_id, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!global_challenge_id && !classroom_challenge_id) {
      return res.status(400).json({ error: 'Provide either global_challenge_id or classroom_challenge_id' });
    }
    if (global_challenge_id && classroom_challenge_id) {
      return res.status(400).json({ error: 'Provide only one challenge source' });
    }
    if (due_date && new Date(due_date) <= new Date()) {
      return res.status(400).json({ error: 'due_date must be in the future' });
    }

    const result = await query(
      `INSERT INTO assignments
        (classroom_id, created_by, title, instructions, global_challenge_id, classroom_challenge_id, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, req.user!.id, title, instructions ?? null,
       global_challenge_id ?? null, classroom_challenge_id ?? null, due_date ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// GET /classrooms/:id/assignments — list assignments (approved members)
router.get('/:id/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await canAccessClassroom(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not a member of this classroom' });
    }
    const result = await query(
      `SELECT a.*,
        c.title  AS challenge_title,  c.difficulty AS challenge_difficulty,
        c.points AS challenge_points, c.category   AS challenge_category,
        cc.title  AS cc_title,  cc.difficulty AS cc_difficulty,
        cc.points AS cc_points, cc.category   AS cc_category,
        sub.is_correct, sub.attempts, sub.submitted_at
       FROM assignments a
       LEFT JOIN challenges c  ON c.id  = a.global_challenge_id
       LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.user_id = $2
       WHERE a.classroom_id = $1 AND a.is_active = TRUE
       ORDER BY a.assigned_at DESC`,
      [req.params.id, req.user!.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /classrooms/:id/members/:userId/assignments — one student's per-assignment status (mentor/admin only)
router.get('/:id/members/:userId/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `SELECT a.*,
        c.title  AS challenge_title,  c.difficulty AS challenge_difficulty,
        c.points AS challenge_points, c.category   AS challenge_category,
        cc.title  AS cc_title,  cc.difficulty AS cc_difficulty,
        cc.points AS cc_points, cc.category   AS cc_category,
        sub.is_correct, sub.attempts, sub.submitted_at,
        CASE
          WHEN sub.is_correct = TRUE THEN 'completed'
          WHEN sub.id IS NOT NULL    THEN 'attempted'
          WHEN a.due_date < NOW()    THEN 'overdue'
          ELSE 'pending'
        END AS status
       FROM assignments a
       LEFT JOIN challenges c  ON c.id  = a.global_challenge_id
       LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.user_id = $2
       WHERE a.classroom_id = $1 AND a.is_active = TRUE
       ORDER BY a.assigned_at DESC`,
      [req.params.id, req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get member assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch member assignments' });
  }
});

// PATCH /classrooms/:id/assignments/:aId — edit assignment (mentor/admin only)
router.patch('/:id/assignments/:aId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const { title, instructions, due_date, is_active } = req.body;
    if (due_date && new Date(due_date) <= new Date()) {
      return res.status(400).json({ error: 'due_date must be in the future' });
    }
    const result = await query(
      `UPDATE assignments SET
        title        = COALESCE($1, title),
        instructions = COALESCE($2, instructions),
        due_date     = COALESCE($3, due_date),
        is_active    = COALESCE($4, is_active)
       WHERE id = $5 AND classroom_id = $6 RETURNING *`,
      [title ?? null, instructions ?? null, due_date ?? null, is_active ?? null,
       req.params.aId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// DELETE /classrooms/:id/assignments/:aId (mentor/admin only)
router.delete('/:id/assignments/:aId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    await query(
      'UPDATE assignments SET is_active = FALSE WHERE id = $1 AND classroom_id = $2',
      [req.params.aId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete assignment error:', err);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// GET /classrooms/:id/assignments/:aId/progress — per-student progress (mentor/admin only)
router.get('/:id/assignments/:aId/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await isMentorOf(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not your classroom' });
    }
    const result = await query(
      `SELECT u.id, u.full_name, u.username, u.email,
        sub.is_correct, sub.attempts, sub.submitted_at,
        CASE
          WHEN sub.is_correct = TRUE THEN 'completed'
          WHEN sub.id IS NOT NULL    THEN 'attempted'
          WHEN a.due_date < NOW()    THEN 'overdue'
          ELSE 'pending'
        END AS status
       FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN assignments a ON a.id = $2
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = $2 AND sub.user_id = u.id
       WHERE cm.classroom_id = $1 AND cm.join_status = 'approved'
       ORDER BY u.full_name`,
      [req.params.id, req.params.aId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get assignment progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ─── Assignment Submission ────────────────────────────────────────────────────

// POST /classrooms/assignments/:aId/submit — approved member submits a flag
router.post('/assignments/:aId/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { flag } = req.body;
    if (!flag) return res.status(400).json({ error: 'flag is required' });

    const aResult = await query(
      `SELECT a.*, cl.id AS classroom_id
       FROM assignments a
       JOIN classrooms cl ON cl.id = a.classroom_id
       WHERE a.id = $1 AND a.is_active = TRUE`,
      [req.params.aId]
    );
    if (aResult.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = aResult.rows[0];

    if (!await isMember(assignment.classroom_id, req.user!.id)) {
      return res.status(403).json({ error: 'Not an approved member of this classroom' });
    }

    const existing = await query(
      'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2',
      [req.params.aId, req.user!.id]
    );
    if (existing.rows[0]?.is_correct) {
      return res.status(400).json({ error: 'Already completed this assignment' });
    }

    let correctFlag: string;
    let points = 0;
    if (assignment.global_challenge_id) {
      const cr = await query('SELECT flag, points FROM challenges WHERE id = $1', [assignment.global_challenge_id]);
      if (cr.rows.length === 0) return res.status(500).json({ error: 'Challenge not found' });
      correctFlag = cr.rows[0].flag;
      points = cr.rows[0].points;
    } else {
      const cr = await query('SELECT flag, points FROM classroom_challenges WHERE id = $1', [assignment.classroom_challenge_id]);
      if (cr.rows.length === 0) return res.status(500).json({ error: 'Challenge not found' });
      correctFlag = cr.rows[0].flag;
      points = cr.rows[0].points;
    }

    const isCorrect = flag === correctFlag;
    const attempts = (existing.rows[0]?.attempts ?? 0) + 1;

    await query(
      `INSERT INTO assignment_submissions (assignment_id, user_id, submitted_flag, is_correct, attempts)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (assignment_id, user_id)
       DO UPDATE SET submitted_flag = $3, is_correct = $4, attempts = $5, submitted_at = NOW()`,
      [req.params.aId, req.user!.id, flag, isCorrect, attempts]
    );

    if (isCorrect) {
      await query(
        `UPDATE user_stats SET
          total_points      = total_points + $1,
          xp                = xp + $1,
          level             = FLOOR((xp + $1) / 1000) + 1,
          challenges_solved = challenges_solved + 1,
          updated_at        = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [points, req.user!.id]
      );
    }

    res.json({
      correct: isCorrect,
      attempts,
      points_awarded: isCorrect ? points : 0,
      message: isCorrect ? 'Correct flag! Points awarded.' : 'Incorrect flag, try again.'
    });
  } catch (err) {
    console.error('Submit assignment error:', err);
    res.status(500).json({ error: 'Failed to submit flag' });
  }
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

// GET /classrooms/:id/leaderboard — ranked by assignment points earned (approved members)
router.get('/:id/leaderboard', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!await canAccessClassroom(req.params.id, req.user!.id, req.user?.role)) {
      return res.status(403).json({ error: 'Not a member of this classroom' });
    }
    const result = await query(
      `SELECT u.id, u.full_name, u.username, u.avatar,
        COUNT(CASE WHEN sub.is_correct THEN 1 END)::int AS assignments_completed,
        COALESCE(SUM(
          CASE WHEN sub.is_correct THEN
            COALESCE(c.points, cc.points, 0)
          END
        ), 0)::int AS classroom_points,
        RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN sub.is_correct THEN COALESCE(c.points, cc.points, 0) END), 0) DESC)::int AS rank
       FROM classroom_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN assignment_submissions sub ON sub.user_id = u.id
       LEFT JOIN assignments a
         ON a.id = sub.assignment_id AND a.classroom_id = $1
       LEFT JOIN challenges c  ON c.id  = a.global_challenge_id
       LEFT JOIN classroom_challenges cc ON cc.id = a.classroom_challenge_id
       WHERE cm.classroom_id = $1 AND cm.join_status = 'approved'
       GROUP BY u.id, u.full_name, u.username, u.avatar
       ORDER BY classroom_points DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
