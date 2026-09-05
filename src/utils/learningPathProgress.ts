import { Course } from '../types/course';
import { Challenge } from '../types';
import { LearningPathDef, PathNodeRef, LEARNING_PATHS } from './learningPaths';

export interface ResolvedPathNode {
  key: string;
  ref: PathNodeRef;
  title: string;
  typeLabel: string;
  route: string;
  status: 'completed' | 'available' | 'locked';
}

export interface ResolvedPathStage {
  label: string;
  nodes: ResolvedPathNode[];
  complete: boolean;
}

export interface ResolvedPath {
  def: LearningPathDef;
  stages: ResolvedPathStage[];
  totalNodes: number;
  completedNodes: number;
  percentComplete: number;
}

function resolveNode(ref: PathNodeRef, coursesById: Map<string, Course>, challengesById: Map<string, Challenge>): Omit<ResolvedPathNode, 'status'> | null {
  if (ref.type === 'course') {
    const c = coursesById.get(ref.courseId);
    if (!c) return null;
    return { key: `course:${c.id}`, ref, title: c.title, typeLabel: 'Course', route: `/course/${c.id}` };
  }

  if (ref.type === 'module') {
    const c = coursesById.get(ref.courseId);
    const m = c?.modules.find((mod) => mod.id === ref.moduleId);
    if (!c || !m) return null;
    return { key: `module:${m.id}`, ref, title: m.title, typeLabel: 'Module', route: m.route };
  }

  const ch = challengesById.get(ref.challengeId);
  if (!ch) return null;
  return { key: `challenge:${ch.id}`, ref, title: ch.title, typeLabel: ch.difficulty, route: `/challenges/${ch.id}` };
}

function isNodeComplete(ref: PathNodeRef, coursesById: Map<string, Course>, challengesById: Map<string, Challenge>): boolean {
  if (ref.type === 'course') {
    return coursesById.get(ref.courseId)?.user_progress?.status === 'completed';
  }
  if (ref.type === 'module') {
    const c = coursesById.get(ref.courseId);
    const m = c?.modules.find((mod) => mod.id === ref.moduleId);
    return m?.user_status === 'completed';
  }
  return challengesById.get(ref.challengeId)?.status === 'completed';
}

export function resolveLearningPath(def: LearningPathDef, courses: Course[], challenges: Challenge[]): ResolvedPath {
  const coursesById = new Map(courses.map((c) => [c.id, c]));
  const challengesById = new Map(challenges.map((c) => [c.id, c]));

  let priorStagesComplete = true;
  const stages: ResolvedPathStage[] = def.stages.map((stage) => {
    const locked = !priorStagesComplete;

    const nodes: ResolvedPathNode[] = stage.nodes
      .map((ref) => {
        const resolved = resolveNode(ref, coursesById, challengesById);
        if (!resolved) return null;
        const completed = isNodeComplete(ref, coursesById, challengesById);
        return { ...resolved, status: completed ? 'completed' : locked ? 'locked' : 'available' } as ResolvedPathNode;
      })
      .filter((n): n is ResolvedPathNode => n !== null);

    const stageComplete = nodes.length > 0 && nodes.every((n) => n.status === 'completed');
    priorStagesComplete = priorStagesComplete && stageComplete;

    return { label: stage.label, nodes, complete: stageComplete };
  });

  const allNodes = stages.flatMap((s) => s.nodes);
  const totalNodes = allNodes.length;
  const completedNodes = allNodes.filter((n) => n.status === 'completed').length;

  return {
    def,
    stages,
    totalNodes,
    completedNodes,
    percentComplete: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
  };
}

export function resolveAllLearningPaths(courses: Course[], challenges: Challenge[]): ResolvedPath[] {
  return LEARNING_PATHS.map((def) => resolveLearningPath(def, courses, challenges));
}
