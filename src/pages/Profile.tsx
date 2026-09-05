import React, { useMemo, useState } from 'react';
import { User } from '../types';
import { users } from '../services/api';
import {
  Calendar,
  Edit,
  Globe,
  MapPin,
  Save,
  Shield,
  Target,
  Trophy,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { detectLocation } from '../services/locationService';
import SkillTree from '../components/profile/SkillTree';

interface ProfileProps {
  user: User;
}

const cardClass = 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 shadow-sm';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(15,23,42,0.03)]';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90';
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]';

const defaultStats: User['stats'] = {
  challengesSolved: 0,
  totalPoints: 0,
  globalRank: 9999,
  dayStreak: 0,
  maxStreak: 0,
  previousStreak: 0,
  lastActiveDate: '',
  streakFreezes: 0,
  level: 1,
  xp: 0,
  activityHistory: [],
};

const normalizeUser = (rawUser: any): User => {
  const stats = rawUser?.stats || {};

  return {
    ...rawUser,
    fullName: rawUser?.fullName ?? rawUser?.full_name ?? '',
    experienceLevel: rawUser?.experienceLevel ?? rawUser?.experience_level ?? 'beginner',
    isProfileComplete: rawUser?.isProfileComplete ?? rawUser?.is_profile_complete ?? false,
    isEmailVerified: rawUser?.isEmailVerified ?? rawUser?.is_email_verified ?? false,
    interests: Array.isArray(rawUser?.interests) ? rawUser.interests : [],
    stats: {
      ...defaultStats,
      challengesSolved: stats?.challengesSolved ?? stats?.challenges_solved ?? defaultStats.challengesSolved,
      totalPoints: stats?.totalPoints ?? stats?.total_points ?? defaultStats.totalPoints,
      globalRank: stats?.globalRank ?? stats?.global_rank ?? defaultStats.globalRank,
      dayStreak: stats?.dayStreak ?? stats?.day_streak ?? defaultStats.dayStreak,
      maxStreak: stats?.maxStreak ?? stats?.max_streak ?? defaultStats.maxStreak,
      previousStreak: stats?.previousStreak ?? stats?.previous_streak ?? defaultStats.previousStreak,
      lastActiveDate: stats?.lastActiveDate ?? stats?.last_active_date ?? defaultStats.lastActiveDate,
      streakFreezes: stats?.streakFreezes ?? stats?.streak_freezes ?? defaultStats.streakFreezes,
      level: stats?.level ?? defaultStats.level,
      xp: stats?.xp ?? defaultStats.xp,
      activityHistory: Array.isArray(stats?.activityHistory)
        ? stats.activityHistory
        : Array.isArray(stats?.activity_history)
          ? stats.activity_history
          : defaultStats.activityHistory,
    },
  };
};

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [profileUser, setProfileUser] = useState<User>(() => normalizeUser(user));
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: profileUser.fullName || '',
    username: profileUser.username || '',
    experienceLevel: profileUser.experienceLevel || 'beginner',
    interests: (profileUser.interests || []).join(', '),
    goals: profileUser.goals || '',
    location: profileUser.location || '',
    timezone: profileUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    bio: profileUser.bio || '',
  });

  const initials = (profileUser.username || profileUser.fullName || profileUser.email || 'CT')
    .slice(0, 2)
    .toUpperCase();

  const xpToNextLevel = useMemo(() => Math.max(0, 1000 - (profileUser.stats.xp % 1000)), [profileUser.stats.xp]);
  const xpPercent = useMemo(() => Math.max(0, Math.min(100, Math.round(((profileUser.stats.xp % 1000) / 1000) * 100))), [profileUser.stats.xp]);

  const activitySummary = useMemo(() => {
    const activeDays = new Set((profileUser.stats.activityHistory || []).map((entry) => entry.slice(0, 10)));
    const today = new Date().toISOString().slice(0, 10);

    return {
      totalActiveDays: activeDays.size,
      lastActive:
        profileUser.stats.lastActiveDate === today
          ? 'Today'
          : profileUser.stats.lastActiveDate || 'No activity yet',
    };
  }, [profileUser.stats.activityHistory, profileUser.stats.lastActiveDate]);

  const recommended = useMemo(() => {
    if (profileUser.stats.challengesSolved === 0) {
      return {
        title: 'Reflected XSS',
        detail: 'Easy • +100 XP • Unlocks Level 2',
      };
    }

    return {
      title: 'JWT Forgery',
      detail: 'Medium • +300 XP • Higher-value web lab',
    };
  }, [profileUser.stats.challengesSolved]);

  const tags = useMemo(() => {
    const values = new Set<string>();
    values.add(profileUser.experienceLevel || 'beginner');
    (profileUser.interests || []).slice(0, 2).forEach((item) => values.add(item));
    while (values.size < 3) values.add(values.size === 1 ? 'Web Security' : 'Forensics');
    return Array.from(values);
  }, [profileUser.experienceLevel, profileUser.interests]);

  const handleEditClick = () => {
    setEditForm({
      fullName: profileUser.fullName || '',
      username: profileUser.username || '',
      experienceLevel: profileUser.experienceLevel || 'beginner',
      interests: (profileUser.interests || []).join(', '),
      goals: profileUser.goals || '',
      location: profileUser.location || '',
      timezone: profileUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      bio: profileUser.bio || '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsedInterests = editForm.interests
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const updatedUser = await users.updateProfile({
        fullName: editForm.fullName,
        username: editForm.username,
        experienceLevel: editForm.experienceLevel as User['experienceLevel'],
        interests: parsedInterests,
        goals: editForm.goals,
        location: editForm.location,
        timezone: editForm.timezone,
        bio: editForm.bio,
      });
      const normalizedUpdated = normalizeUser({
        ...profileUser,
        ...updatedUser,
        stats: profileUser.stats,
      });
      setProfileUser(normalizedUpdated);
      setEditForm({
        fullName: normalizedUpdated.fullName || '',
        username: normalizedUpdated.username || '',
        experienceLevel: normalizedUpdated.experienceLevel || 'beginner',
        interests: (normalizedUpdated.interests || []).join(', '),
        goals: normalizedUpdated.goals || '',
        location: normalizedUpdated.location || '',
        timezone: normalizedUpdated.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        bio: normalizedUpdated.bio || '',
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update profile', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDetect = async () => {
    try {
      const result = await detectLocation();
      setEditForm((prev) => ({
        ...prev,
        location: `${result.city}, ${result.country}`,
        timezone: result.timezone || prev.timezone,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-2 pb-10">
      <section className={`${cardClass} overflow-hidden p-0`}>
        <div className="border-b border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] px-6 py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-2xl font-bold text-[var(--text-primary)]">
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt="User avatar" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                  {profileUser.fullName || profileUser.username || 'CyTutor Student'}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  @{profileUser.username || 'operator'} • {profileUser.timezone || 'UTC'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={cardClass}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{profileUser.stats.level}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">LEVEL</div>
              </div>
              <div className={cardClass}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">#{profileUser.stats.globalRank}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">RANK</div>
              </div>
              <div className={cardClass}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{profileUser.stats.dayStreak}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">STREAK</div>
              </div>
              <div className={cardClass}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{profileUser.stats.challengesSolved}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">SOLVED</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={handleEditClick} className={buttonClass} type="button">
                <Edit className="h-4 w-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>LVL {profileUser.stats.level}</span>
            <span>{profileUser.stats.xp} / 1000 XP</span>
            <span>LVL {profileUser.stats.level + 1}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[rgba(15,23,42,0.08)]">
            <div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${xpPercent}%` }} />
          </div>
          <div className="mt-2 text-sm text-[var(--text-secondary)]">+{xpToNextLevel} XP to level up</div>
        </div>
      </section>

      <section className={cardClass}>
        <div className={labelClass}>Progression</div>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Skill Tree</h2>
        <div className="mt-5">
          <SkillTree />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <div className={labelClass}>Activity</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Current Summary</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">Total Active Days</div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{activitySummary.totalActiveDays}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">Current Streak</div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{profileUser.stats.dayStreak}</div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
              <div className="text-sm text-[var(--text-secondary)]">Last Active</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{activitySummary.lastActive}</div>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className={labelClass}>Recommended</div>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{recommended.title}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{recommended.detail}</p>
          <button className={`${buttonClass} mt-5`}>
            START CHALLENGE
            <Target className="h-4 w-4" />
          </button>
        </section>
      </div>

      <section className={cardClass}>
        <div className={labelClass}>Status</div>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Account Signals</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <Shield className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Email Verified</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              {profileUser.isEmailVerified ? 'Verification complete' : 'Verification pending'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <Trophy className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Rank Position</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">#{profileUser.stats.globalRank} overall</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Practice Status</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{profileUser.stats.dayStreak} day streak</div>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={labelClass}>Profile</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Operator Details</h2>
          </div>
          <button onClick={handleEditClick} className={buttonClass} type="button">
            <Edit className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <MapPin className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Location</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{profileUser.location || 'Not set'}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <Globe className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Timezone</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{profileUser.timezone || 'UTC'}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <UserRound className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Experience</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{profileUser.experienceLevel || 'beginner'}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
            <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
            <div className="mt-3 font-semibold text-[var(--text-primary)]">Joined</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{new Date().getFullYear()}</div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--accent-primary)]" />
            <div className="font-semibold text-[var(--text-primary)]">Bio</div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {profileUser.bio || 'No bio added yet.'}
          </p>
        </div>
      </section>

      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-6 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center">
            <div className="flex w-full max-w-3xl max-h-[calc(100vh-3rem)] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
              <div>
                <div className={labelClass}>Profile Settings</div>
                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Edit Operator Profile</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Update your identity, learning focus, and public profile details.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[rgba(15,23,42,0.05)] hover:text-[var(--text-primary)]"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-5">
                <div className={labelClass}>Identity</div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`${labelClass} mb-2 block`}>Full Name</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      placeholder="CyTutor Demo"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>

                  <div>
                    <label className={`${labelClass} mb-2 block`}>Username</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      placeholder="demo_user"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-5 border-t border-[var(--border-subtle)] pt-5">
                <div className={labelClass}>Environment</div>
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className={labelClass}>Location</label>
                      <button
                        onClick={handleAutoDetect}
                        className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent-primary)] hover:underline"
                        type="button"
                      >
                        Auto Detect
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Chennai, India"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={`${labelClass} mb-2 block`}>Timezone</label>
                      <input
                        type="text"
                        value={editForm.timezone}
                        onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                        placeholder="Asia/Kolkata"
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                      />
                    </div>

                    <div>
                      <label className={`${labelClass} mb-2 block`}>Experience Level</label>
                      <select
                        value={editForm.experienceLevel}
                        onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-5 border-t border-[var(--border-subtle)] pt-5">
                <div className={labelClass}>Focus</div>
                <div className="mt-3 space-y-4">
                  <div>
                    <label className={`${labelClass} mb-2 block`}>Interests</label>
                    <input
                      type="text"
                      value={editForm.interests}
                      onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                      placeholder="Web Security, Forensics, Linux"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                    />
                    <p className="mt-2 text-xs text-[var(--text-muted)]">Separate interests with commas.</p>
                    {editForm.interests.trim() && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {editForm.interests
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                            >
                              {interest}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`${labelClass} mb-2 block`}>Goals</label>
                    <textarea
                      value={editForm.goals}
                      onChange={(e) => setEditForm({ ...editForm, goals: e.target.value })}
                      placeholder="Describe what you want to master next."
                      className="h-24 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-5">
                <div className={labelClass}>Public Bio</div>
                <div className="mt-3">
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell people what kind of operator you are becoming."
                    className="h-28 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowEditModal(false)} className={buttonClass}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                type="button"
                className={primaryButtonClass}
                style={{ backgroundColor: 'var(--accent-primary)' }}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
