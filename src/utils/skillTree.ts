import { Course, CourseModule } from '../types/course';

export interface SkillTreeModule extends CourseModule {
  locked: boolean;
}

/**
 * Prerequisite ids on a course's modules only ever reference sibling modules
 * within that same course (course_modules.id === course_modules.tutorial_id,
 * and prerequisite chains never cross categories) — so lock state can be
 * derived from a single course's own modules array.
 */
export function withLockState(course: Course): SkillTreeModule[] {
  const statusById = new Map(course.modules.map((m) => [m.id, m.user_status ?? 'not_started']));

  return course.modules.map((m) => ({
    ...m,
    locked: m.prerequisites.length > 0 && m.prerequisites.some((id) => statusById.get(id) !== 'completed'),
  }));
}

export function findModule(course: Course, id: string): CourseModule | undefined {
  return course.modules.find((m) => m.id === id);
}
