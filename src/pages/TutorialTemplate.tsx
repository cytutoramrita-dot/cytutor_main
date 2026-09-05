import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Crosshair,
  ExternalLink,
  Flag,
  Layers3,
  Play,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trophy,
  Zap,
} from 'lucide-react';
import { tutorials } from '../services/api';
import { Tutorial, TutorialSection } from '../types/tutorial';

const levelXpMap = {
  beginner: 120,
  intermediate: 240,
  advanced: 420,
} as const;

const levelToneMap = {
  beginner: 'text-[var(--accent)] border-[var(--accent-border)] bg-[var(--accent-dim)]',
  intermediate: 'text-[#3B82F6] border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.08)]',
  advanced: 'text-[#EF4444] border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]',
} as const;

const sectionToneMap = {
  concept: {
    icon: BookOpen,
    label: 'Concept',
    helper: 'Understand the mental model before touching the target.',
    accent: 'var(--accent)',
    soft: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.18)',
  },
  attack: {
    icon: ShieldAlert,
    label: 'Real Attack Example',
    helper: 'See how the idea fails in production under real pressure.',
    accent: '#EF4444',
    soft: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  code: {
    icon: Terminal,
    label: 'Code / Demo',
    helper: 'Read the command path, then reproduce it in a sandbox.',
    accent: '#22C55E',
    soft: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.18)',
  },
  takeaway: {
    icon: Trophy,
    label: 'Key Takeaway',
    helper: 'Compress the lesson into one rule you can reuse later.',
    accent: '#F59E0B',
    soft: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.18)',
  },
} as const;

type SectionTone = keyof typeof sectionToneMap;

const normalizeMarkdownContent = (content: string) =>
  content
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

const stripMarkdownForPreview = (content: string) =>
  normalizeMarkdownContent(content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Tutorials are grouped by course category, which doesn't match challenge
// domains 1:1 — map to the closest challenge category from docs/COURSES_AND_LEARNING_PATHS.md.
const categoryToChallengeDomain: Record<string, string> = {
  'Computer Networks': 'Network Security',
  'Linux Fundamentals': 'Privilege Escalation',
  'Cybersecurity Fundamentals': 'Web Exploitation',
};

// A few individual modules map to a more specific domain than their course as a whole.
const tutorialChallengeDomainOverrides: Record<string, string> = {
  'security-cryptography': 'Cryptography',
};

const getChallengesLinkForTutorial = (tutorial: Pick<Tutorial, 'id' | 'category'> | null) => {
  if (!tutorial) return '/challenges';
  const domain = tutorialChallengeDomainOverrides[tutorial.id] ?? categoryToChallengeDomain[tutorial.category];
  return domain ? `/challenges?domain=${encodeURIComponent(domain)}` : '/challenges';
};

const pageCardClass = 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 shadow-sm';
const subtleCardClass = 'rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-5';
const neutralButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[rgba(15,23,42,0.03)]';
const accentButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-[var(--border-accent)] bg-[var(--accent-soft)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent-primary)] transition-colors hover:border-[var(--accent-primary)]';
const progressTrackStyle = { backgroundColor: 'rgba(15,23,42,0.08)' };

const TutorialTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [visitedSections, setVisitedSections] = useState<Record<number, boolean>>({});
  const [localProgress, setLocalProgress] = useState(0);
  const lastSyncedProgressRef = useRef(0);
  const copyTimeoutRef = useRef<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const challengesLink = useMemo(() => getChallengesLinkForTutorial(tutorial), [tutorial]);

  useEffect(() => {
    const fetchTutorial = async () => {
      try {
        setLoading(true);
        const tutorialData = await tutorials.getById(id!);
        setTutorial(tutorialData);
        const startingProgress = tutorialData.user_progress || 0;
        setLocalProgress(startingProgress);
        lastSyncedProgressRef.current = startingProgress;
        setExpandedSections({ 0: true });
        setVisitedSections(startingProgress > 0 ? { 0: true } : {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tutorial');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTutorial();
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      if (errorTimeoutRef.current) window.clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const syncProgress = async (progressPercentage: number) => {
    try {
      await tutorials.updateProgress(id!, progressPercentage, 5);
      lastSyncedProgressRef.current = progressPercentage;
    } catch (syncError) {
      console.error('Failed to update progress:', syncError);
      setError('Failed to save progress. Please try again.');
      if (errorTimeoutRef.current) window.clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = window.setTimeout(() => setError(null), 3000);
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopiedCommand(null), 2000);
  };

  const classifySection = (section: TutorialSection): SectionTone => {
    if (section.type === 'code') return 'code';

    const haystack = `${section.title} ${normalizeMarkdownContent(section.content)}`.toLowerCase();
    if (
      haystack.includes('attack') ||
      haystack.includes('exploit') ||
      haystack.includes('vulnerab') ||
      haystack.includes('breach') ||
      haystack.includes('real-world')
    ) {
      return 'attack';
    }
    if (
      haystack.includes('key takeaway') ||
      haystack.includes('remember') ||
      haystack.includes('important') ||
      haystack.includes('summary')
    ) {
      return 'takeaway';
    }
    return 'concept';
  };

  const extractTakeaway = (content: string) => {
    const firstMeaningfulLine = normalizeMarkdownContent(content)
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('```'));

    if (!firstMeaningfulLine) {
      return 'Understand the pattern, then apply it in the lab.';
    }

    return stripMarkdownForPreview(firstMeaningfulLine);
  };

  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-[var(--text-primary)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderTextContent = (content: string) => {
    const normalizedContent = normalizeMarkdownContent(content);
    const lines = normalizedContent.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        const codeLines: string[] = [];
        const language = line.trim().slice(3).trim() || 'Terminal';
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        elements.push(
          <div
            key={`code-${i}`}
            className="mt-6 overflow-hidden rounded-xl border shadow-sm"
            style={{ backgroundColor: '#0b1220', borderColor: '#1e293b' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: '#1e293b', backgroundColor: '#111827' }}>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <Terminal className="h-4 w-4" />
                {language}
              </div>
              <button
                onClick={() => copyCommand(codeLines.join('\n'))}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                {copiedCommand === codeLines.join('\n') ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 text-[#A7F3D0]">
              <code>
                {codeLines.map((codeLine, lineIndex) => (
                  <div key={`${language}-${lineIndex}`} className="grid grid-cols-[auto_1fr] gap-4">
                    <span className="select-none text-right text-[#4B5563]">{lineIndex + 1}</span>
                    <span>{codeLine || ' '}</span>
                  </div>
                ))}
              </code>
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: '#1e293b', backgroundColor: '#111827' }}>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Practice this command path in a sandboxed challenge when ready.
              </div>
              <Link
                to={challengesLink}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-300 transition-colors hover:border-emerald-300 hover:text-white"
              >
                Launch Lab
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>,
        );
        i++;
        continue;
      }

      if (line.trim().startsWith('-')) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('-')) {
          listItems.push(lines[i].trim().slice(1).trim());
          i++;
        }

        elements.push(
          <div key={`list-${i}`} className="mt-5 space-y-3">
            {listItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                <span className="mt-[10px] h-[6px] w-[6px] rounded-full bg-[var(--accent)]" />
                <span>{renderInlineFormatting(item)}</span>
              </div>
            ))}
          </div>,
        );
        continue;
      }

      if (/^\d+\./.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\./.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
          i++;
        }

        elements.push(
          <div key={`ordered-${i}`} className="mt-5 space-y-3">
            {listItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                <span className="mt-[1px] min-w-[24px] font-mono text-[13px] font-semibold text-[var(--accent)]">
                  {idx + 1}.
                </span>
                <span>{renderInlineFormatting(item)}</span>
              </div>
            ))}
          </div>,
        );
        continue;
      }

      if (line.trim() === '') {
        elements.push(<div key={`space-${i}`} className="h-3" />);
        i++;
        continue;
      }

      elements.push(
        <p key={`text-${i}`} className="mt-4 text-[15px] leading-7 text-[var(--text-secondary)]">
          {renderInlineFormatting(line)}
        </p>,
      );
      i++;
    }

    return <div>{elements}</div>;
  };

  const markSectionVisited = async (index: number) => {
    if (!tutorial) return;
    if (visitedSections[index]) return;

    const nextVisited = { ...visitedSections, [index]: true };
    setVisitedSections(nextVisited);

    const viewedCount = Object.keys(nextVisited).length;
    const sectionCount = tutorial.content.sections.length || 1;
    const nextProgress = Math.max(
      localProgress,
      Math.min(99, Math.round((viewedCount / sectionCount) * 100)),
    );

    if (nextProgress > localProgress) {
      setLocalProgress(nextProgress);
    }

    if (nextProgress > lastSyncedProgressRef.current) {
      await syncProgress(nextProgress);
    }
  };

  const toggleSection = async (index: number) => {
    setExpandedSections({ [index]: true });
    await markSectionVisited(index);
    window.requestAnimationFrame(() => {
      sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleComplete = async () => {
    setLocalProgress(100);
    await syncProgress(100);
    navigate('/materials');
  };

  const progressBarValue = tutorial?.content.sections.length ? localProgress : tutorial?.user_progress || 0;
  const sectionStats = useMemo(() => {
    if (!tutorial) return { total: 0, explored: 0 };
    return {
      total: tutorial.content.sections.length,
      explored: Object.keys(visitedSections).length,
    };
  }, [tutorial, visitedSections]);
  const currentSectionIndex = useMemo(() => {
    const expanded = Object.entries(expandedSections).find(([, open]) => open);
    if (!expanded) return 0;
    return Number(expanded[0]);
  }, [expandedSections]);
  const currentSection = tutorial?.content.sections[currentSectionIndex];
  const currentTone = currentSection ? classifySection(currentSection) : 'concept';
  const nextSectionIndex = useMemo(() => {
    if (!tutorial) return 0;
    return Math.min(currentSectionIndex + 1, tutorial.content.sections.length - 1);
  }, [tutorial, currentSectionIndex]);
  const completionReady = progressBarValue >= 100 || sectionStats.explored === sectionStats.total;
  const sectionFlow = useMemo(() => {
    if (!tutorial) return [];
    return tutorial.content.sections.map((section, index) => ({
      index,
      title: section.title,
      tone: classifySection(section),
      visited: !!visitedSections[index],
      active: !!expandedSections[index],
    }));
  }, [tutorial, visitedSections, expandedSections]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-[var(--accent)]">Loading tutorial...</div>
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Tutorial Not Found</h2>
          <p className="mb-4 text-[var(--text-secondary)]">
            {error || 'The requested tutorial could not be found.'}
          </p>
          <button
            onClick={() => navigate('/materials')}
            className="rounded-[10px] bg-[var(--accent)] px-5 py-3 font-semibold text-black transition-opacity hover:opacity-90"
          >
            Back to Materials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in px-6 py-8">
      <div className="sticky top-0 z-20 mb-6 border-b border-[var(--border-subtle)] bg-[rgba(240,244,248,0.92)] py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-5 py-4 shadow-sm">
          <div className="min-w-[220px] flex-1">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Active Module
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
              {tutorial.title}
            </div>
          </div>

          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <span>Current Step</span>
              <span>{currentSectionIndex + 1}/{tutorial.content.sections.length}</span>
            </div>
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {currentSection?.title || 'Overview'}
            </div>
            <div
              className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.16em]"
              style={{ color: sectionToneMap[currentTone].accent }}
            >
              {sectionToneMap[currentTone].label}
            </div>
          </div>

          <div className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <span>Progress</span>
              <span>{progressBarValue}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={progressTrackStyle}>
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${progressBarValue}%` }} />
            </div>
          </div>

          <Link
            to={challengesLink}
            className={accentButtonClass}
          >
            Try Attack
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void toggleSection(nextSectionIndex)}
            className={neutralButtonClass}
          >
            Next Step
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className={`${pageCardClass} mb-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-soft)] px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {tutorial.level}
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              Level {tutorial.level === 'beginner' ? 1 : tutorial.level === 'intermediate' ? 2 : 3}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#60A5FA]">XP</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {levelXpMap[tutorial.level]} XP
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#F59E0B]">Progress</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {progressBarValue}% complete
            </div>
          </div>

          <div className="min-w-[260px] flex-1">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <span>Learning Progress</span>
              <span>
                {sectionStats.explored}/{sectionStats.total} sections explored
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={progressTrackStyle}>
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${progressBarValue}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`${pageCardClass} mb-8`}>
        <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
          <Layers3 className="h-4 w-4" />
          Guided Flow
        </div>
        <div className="mb-4 grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[rgba(15,23,42,0.03)] p-4 md:grid-cols-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">1. Concept</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">Build the mental model and know what the system promises.</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#F87171]">2. Example</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">See where attackers break that promise in a live environment.</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#22C55E]">3. Try Yourself</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">Extract the command path or pattern you will repeat in a challenge.</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#F59E0B]">4. Summary</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">Compress the lesson into one reusable rule before moving on.</div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {sectionFlow.map((step) => {
            const toneConfig = sectionToneMap[step.tone];
            return (
              <button
                key={`${step.title}-${step.index}`}
                type="button"
                onClick={() => toggleSection(step.index)}
                className={`rounded-[14px] border p-4 text-left transition-all ${
                  step.active
                    ? 'scale-[1.01] bg-[var(--bg-secondary)]'
                    : 'bg-[rgba(15,23,42,0.03)] hover:bg-[rgba(15,23,42,0.05)]'
                }`}
                style={{ borderColor: step.active ? toneConfig.border : 'var(--border-subtle)' }}
              >
                <div
                  className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em]"
                  style={{ color: toneConfig.accent }}
                >
                  Step {step.index + 1}
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</div>
                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  {sectionToneMap[step.tone].label}
                  {step.visited ? ' · explored' : ''}
                </div>
                <div className="mt-3 text-xs leading-6 text-[var(--text-secondary)]">
                  {sectionToneMap[step.tone].helper}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <div className={`${pageCardClass} p-6 md:p-6`}>
            <button
              onClick={() => navigate('/materials')}
              className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Materials
            </button>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${levelToneMap[tutorial.level]}`}
              >
                {tutorial.category}
              </span>
              <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Clock className="h-4 w-4" />
                {tutorial.estimated_time} min
              </span>
              <span className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Zap className="h-4 w-4" />
                Attack-first walkthrough
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
              {tutorial.title}
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
              {tutorial.description}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--accent-soft)] p-5">
                <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  <BookOpen className="h-4 w-4" />
                  What You Will Break Down
                </div>
                <div className="space-y-3">
                  {tutorial.learning_objectives.map((objective, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm leading-7 text-[var(--text-primary)]">
                      <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <span>{objective}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.05)] p-5">
                <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#F87171]">
                  <Flag className="h-4 w-4" />
                  Real-World Hook
                </div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  This module is most useful when you read it like an attacker. Focus on how the
                  concept fails in production, what signal reveals the weakness, and what action
                  actually turns theory into access.
                </p>

                {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
                  <div className="mt-4 border-t border-[rgba(239,68,68,0.16)] pt-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[#FCA5A5]">
                      Prerequisites
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tutorial.prerequisites.map((prereq, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                        >
                          {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-6">
            <ErrorBoundary>
              {tutorial.content.sections.map((section, index) => {
                const tone = classifySection(section);
                const toneConfig = sectionToneMap[tone];
                const Icon = toneConfig.icon;
                const isOpen = expandedSections[index] ?? index === 0;

                return (
                  <section
                    key={`${section.title}-${index}`}
                    ref={(node) => {
                      sectionRefs.current[index] = node;
                    }}
                    className="overflow-hidden rounded-xl border bg-[var(--bg-secondary)] shadow-sm"
                    style={{ borderColor: toneConfig.border }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(index)}
                      className="flex w-full items-start justify-between gap-4 p-6 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-[12px] border"
                            style={{ background: toneConfig.soft, borderColor: toneConfig.border }}
                          >
                            <Icon className="h-5 w-5" style={{ color: toneConfig.accent }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div
                                className="font-mono text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: toneConfig.accent }}
                              >
                                {toneConfig.label}
                              </div>
                              <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                Step {index + 1}
                              </span>
                            </div>
                            <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                              {section.title}
                            </div>
                          </div>
                        </div>

                        <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                          {extractTakeaway(section.content)}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span
                            className="rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
                            style={{ color: toneConfig.accent, borderColor: toneConfig.border, background: toneConfig.soft }}
                          >
                            {toneConfig.label}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            {toneConfig.helper}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1 shrink-0 text-[var(--text-secondary)]">
                        {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-[var(--border-subtle)] px-6 pb-6 pt-5">
                        <div
                          className="mb-6 rounded-[14px] border p-4"
                          style={{ background: toneConfig.soft, borderColor: toneConfig.border }}
                        >
                          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: toneConfig.accent }}>
                            <Crosshair className="h-4 w-4" />
                            Operator Focus
                          </div>
                          <p className="text-sm leading-7 text-[var(--text-primary)]">
                            {tone === 'concept' && 'Read this section looking for the failure condition: what assumption breaks, and what signal tells you it is breakable.'}
                            {tone === 'attack' && 'Map the attacker path in order: entry point, weak control, payload, and impact. That sequence is what you will reproduce later.'}
                            {tone === 'code' && 'Do not skim the commands. Identify which line changes state, which line verifies access, and what output proves success.'}
                            {tone === 'takeaway' && 'Reduce this section to one rule you can recall quickly during a challenge or an interview.'}
                          </p>
                        </div>

                        {renderTextContent(section.content)}

                        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                          <div
                            className="rounded-[14px] border p-4"
                            style={{ background: toneConfig.soft, borderColor: toneConfig.border }}
                          >
                            <div
                              className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em]"
                              style={{ color: toneConfig.accent }}
                            >
                              Key Takeaway
                            </div>
                            <p className="text-sm leading-7 text-[var(--text-primary)]">
                              {extractTakeaway(section.content)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
                            <Link
                              to={challengesLink}
                              className={accentButtonClass}
                            >
                              <Play className="h-4 w-4" />
                              Launch Lab
                            </Link>
                            {index < tutorial.content.sections.length - 1 && (
                              <button
                                type="button"
                                onClick={() => void toggleSection(index + 1)}
                                className={neutralButtonClass}
                              >
                                Continue
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </ErrorBoundary>
          </div>

          {tutorial.resources && tutorial.resources.length > 0 && (
            <div className="mt-10 rounded-xl border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.05)] p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#60A5FA]">
                <ExternalLink className="h-4 w-4" />
                Additional Resources
              </div>
              <div className="space-y-3">
                {tutorial.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[#2563EB] transition-colors hover:bg-[rgba(37,99,235,0.05)]"
                  >
                    {resource}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 rounded-xl border border-[var(--border-accent)] bg-[var(--accent-soft)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  {completionReady ? 'Module Completed' : 'Mission Wrap-Up'}
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                  {completionReady ? 'You finished the module. Claim the progress and keep moving.' : 'Ready to lock this module in?'}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                  {completionReady
                    ? 'You have explored every section. Save the completion state, jump into a challenge, or move to the next module while the attack path is still fresh.'
                    : 'Save your progress, move back to the learning catalog, or jump straight into a lab while the exploit path is still fresh.'}
                </p>
                <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
                    Reward
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    +{levelXpMap[tutorial.level]} XP on completion
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const nextIndex = Math.min(currentSectionIndex + 1, tutorial.content.sections.length - 1);
                    void toggleSection(nextIndex);
                  }}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[rgba(15,23,42,0.03)]"
                >
                  Next Step
                </button>
                <Link
                  to={challengesLink}
                  className="rounded-xl border border-[var(--border-accent)] bg-[var(--bg-secondary)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                  Launch Lab
                </Link>
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                >
                  Mark Complete
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="space-y-6">
          <div className="sticky top-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 shadow-sm">
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Module Flow
            </div>
            <div className="space-y-3">
              {tutorial.content.sections.map((section, index) => {
                const isVisited = !!visitedSections[index];
                const isActive = !!expandedSections[index];
                return (
                  <button
                    key={section.title}
                    type="button"
                    onClick={() => toggleSection(index)}
                    className={`w-full rounded-[14px] border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-[var(--border-accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[rgba(15,23,42,0.03)]'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isVisited ? 'bg-[var(--accent)] text-black' : 'bg-[rgba(15,23,42,0.08)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</span>
                    </div>
                    <div className="pl-8 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      {sectionToneMap[classifySection(section)].label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#F59E0B]">
                Learning Snapshot
              </div>
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-semibold text-[var(--text-primary)] capitalize">
                    {progressBarValue >= 100 ? 'completed' : progressBarValue > 0 ? 'in progress' : 'not started'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sections explored</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {sectionStats.explored}/{sectionStats.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estimated time</span>
                  <span className="font-semibold text-[var(--text-primary)]">{tutorial.estimated_time} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Next unlock</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {sectionToneMap[currentTone].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#60A5FA]">
                Next Action
              </div>
              <div className="rounded-xl border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.05)] p-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {completionReady ? 'Mark the module complete and move on.' : sectionFlow[nextSectionIndex]?.title || 'Continue the walkthrough.'}
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {completionReady
                    ? 'This module is ready to be logged to the backend as complete.'
                    : 'Stay in sequence. Finishing the next section keeps progress, context, and completion state aligned.'}
                </p>
                {!completionReady ? (
                  <button
                    type="button"
                    onClick={() => void toggleSection(nextSectionIndex)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[rgba(15,23,42,0.03)]"
                  >
                    Open Next Step
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black transition-opacity hover:opacity-90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Claim Completion
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TutorialTemplate;
