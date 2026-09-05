import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challenges } from '../services/api';
import { Challenge } from '../types';
import Card from '../components/ui/Card';
import Toast from '../components/Toast';
import ScratchTerminal from '../components/ScratchTerminal';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, Play, Square, Copy, Download, Lightbulb, Flag, Terminal, Globe, CheckCircle, X } from 'lucide-react';

const formatDenseTokens = (text: string) =>
  text.replace(/([A-Za-z0-9+/=]{32,})/g, (token) => {
    const chunks = token.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : token;
  });

const ChallengeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const [instanceInfo, setInstanceInfo] = useState<{ url: string; port: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalWidth, setTerminalWidth] = useState(420);
  const resizingRef = useRef(false);

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const maxWidth = Math.min(900, window.innerWidth - 40);
    const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 300), maxWidth);
    setTerminalWidth(newWidth);
  };

  const stopResize = () => {
    resizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResize);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    loadChallenge();
  }, [id]);

  useEffect(() => stopResize, []);

  const loadChallenge = async () => {
    try {
      const data = await challenges.getById(id!);
      setChallenge(data);
      
      // If instance is running, set instance info
      if (data.status === 'running' && data.instance_port) {
        const host = window.location.hostname;
        setInstanceInfo({
          url: `http://${host}:${data.instance_port}`,
          port: data.instance_port
        });
      }
    } catch (error) {
      console.error('Failed to load challenge:', error);
      showToast({ type: 'error', message: 'Failed to load challenge' });
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!challenge) return;
    
    setStarting(true);
    try {
      const result = await challenges.start(challenge.id);
      setInstanceInfo(result);
      await loadChallenge();
      showToast({ type: 'success', message: 'Instance started successfully!' });
    } catch (error: any) {
      console.error('Failed to start challenge:', error);
      showToast({ type: 'error', message: error.response?.data?.error || 'Failed to start instance' });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!challenge) return;
    
    try {
      await challenges.stop(challenge.id);
      setInstanceInfo(null);
      await loadChallenge();
      showToast({ type: 'success', message: 'Instance stopped' });
    } catch (error) {
      console.error('Failed to stop challenge:', error);
      showToast({ type: 'error', message: 'Failed to stop instance' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !flagInput.trim()) return;

    setSubmitting(true);

    try {
      const result = await challenges.submit(challenge.id, flagInput.trim());
      if (result.success) {
        showToast({ type: 'success', message: `Correct! +${result.points} points 🎉` });
        setFlagInput('');
        await loadChallenge();
      }
    } catch (error: any) {
      showToast({ type: 'error', message: error.response?.data?.error || 'Incorrect flag' });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast({ type: 'success', message: 'Copied to clipboard!' });
  };

  const toggleHint = (index: number) => {
    setRevealedHints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-green font-mono">Loading challenge...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Challenge not found</div>
      </div>
    );
  }

  const requiresInstance = challenge.challenge_type === 'web' || challenge.challenge_type === 'terminal';
  const isRunning = challenge.status === 'running';
  const isCompleted = challenge.status === 'completed';
  const hasDensePayload = /\S{40,}/.test(challenge.description);
  const formattedDescription = hasDensePayload ? formatDenseTokens(challenge.description) : challenge.description;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast notification */}
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={dismissToast} />}

      {/* Back Button */}
      <button
        onClick={() => navigate('/challenges')}
        className="flex items-center space-x-2 text-gray-400 hover:text-neon-green transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Challenges</span>
      </button>

      {/* Challenge Header */}
      <div className="relative rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
        <div className="h-24 bg-gradient-to-r from-neon-green/10 to-neon-purple/10"></div>
        <div className="px-8 pb-6 -mt-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <span className={`px-3 py-1 rounded text-xs font-bold uppercase border ${
                  challenge.difficulty === 'Easy' ? 'border-green-500 text-green-500 bg-green-500/10' :
                  challenge.difficulty === 'Medium' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                  'border-red-500 text-red-500 bg-red-500/10'
                }`}>
                  {challenge.difficulty}
                </span>
                <span className="text-gray-400 text-sm font-mono uppercase tracking-wider">{challenge.category}</span>
                {isCompleted && (
                  <span className="flex items-center space-x-1 text-neon-green text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">{challenge.title}</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-neon-green font-mono">{challenge.points}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Points</div>
            </div>
          </div>
        </div>
      </div>

          {/* Description */}
          <Card>
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-bold text-white">Challenge Description</h2>
              <button
                onClick={() => copyToClipboard(challenge.description)}
                className="px-3 py-1.5 rounded-md border border-neon-green/30 text-xs font-bold text-neon-green hover:bg-neon-green/10 transition-colors flex items-center gap-2"
                title="Copy challenge description"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            {hasDensePayload && (
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Encoded Sequence</p>
            )}

            <div className="max-w-full overflow-x-auto rounded-lg border border-gray-800 bg-black/40 p-4">
              <p
                className={`text-gray-300 whitespace-pre-wrap break-all ${hasDensePayload ? 'font-mono text-sm leading-7' : 'leading-relaxed'}`}
                style={{ overflowWrap: 'anywhere' }}
              >
                {formattedDescription}
              </p>
            </div>
          </Card>

          {/* Hints */}
          {challenge.hints && challenge.hints.length > 0 && (
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Hints</h2>
              </div>
              <div className="space-y-3">
                {challenge.hints.slice(0, 2).map((hint, index) => (
                  <div key={index} className="border border-yellow-500/30 rounded-lg overflow-hidden bg-black/20">
                    <button
                      onClick={() => toggleHint(index)}
                      className="w-full p-3 hover:bg-yellow-500/10 transition-colors flex items-center justify-between"
                    >
                      <span className="text-yellow-400 font-bold">Hint {index + 1}</span>
                      <span className="text-yellow-400 text-sm">
                        {revealedHints.has(index) ? '▼ Hide' : '▶ Reveal'}
                      </span>
                    </button>
                    {revealedHints.has(index) && (
                      <div className="p-4 bg-black/40 border-t border-yellow-500/20 animate-fade-in">
                        <p className="text-gray-300">{hint}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Instance Controls (Web/Terminal only) */}
          {requiresInstance && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {challenge.challenge_type === 'web' ? (
                    <Globe className="w-5 h-5 text-neon-green" />
                  ) : (
                    <Terminal className="w-5 h-5 text-neon-green" />
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {challenge.challenge_type === 'web' ? 'Web Instance' : 'Terminal Access'}
                  </h2>
                </div>
                {isRunning ? (
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg font-bold text-sm flex items-center space-x-2 hover:bg-red-500/30 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop Instance</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="px-4 py-2 bg-neon-green text-black rounded-lg font-bold text-sm flex items-center space-x-2 hover:bg-neon-green-dark hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>{starting ? 'Starting...' : 'Start Instance'}</span>
                  </button>
                )}
              </div>

              {isRunning && instanceInfo && (
                <div className="space-y-3">
                  {/* IP Address and Port Display */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-black/40 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">IP Address</div>
                      <div className="font-mono text-neon-green text-lg font-bold">{window.location.hostname}</div>
                    </div>
                    <div className="p-4 bg-black/40 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Port</div>
                      <div className="font-mono text-neon-green text-lg font-bold">{instanceInfo.port}</div>
                    </div>
                  </div>

                  {challenge.challenge_type === 'web' ? (
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Access URL</div>
                        <div className="font-mono text-neon-green break-all">{instanceInfo.url}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(instanceInfo.url)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors ml-3"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">SSH Command</div>
                          <div className="font-mono text-neon-green text-sm break-all">
                            ssh ctfuser@{window.location.hostname} -p {instanceInfo.port}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`ssh ctfuser@${window.location.hostname} -p ${instanceInfo.port}`)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors ml-3"
                          title="Copy command"
                        >
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">
                          💡 Use the credentials provided in the challenge description
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isRunning && (
                <p className="text-gray-400 text-sm">
                  Click "Start Instance" to launch your {challenge.challenge_type === 'web' ? 'web' : 'terminal'} environment
                </p>
              )}
            </Card>
          )}

          {/* Downloadable Files */}
          {challenge.challenge_type === 'downloadable' && challenge.file_attachments && challenge.file_attachments.length > 0 && (
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <Download className="w-5 h-5 text-neon-green" />
                <h2 className="text-xl font-bold text-white">Download Files</h2>
              </div>
              <div className="space-y-2">
                {challenge.file_attachments.map((file, index) => (
                  <a
                    key={index}
                    href={file}
                    download
                    className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700 hover:border-neon-green hover:bg-black/60 transition-all group"
                  >
                    <span className="text-gray-300 font-mono text-sm group-hover:text-neon-green transition-colors">
                      {file.split('/').pop()}
                    </span>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-neon-green transition-colors" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Flag Submission */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Flag className="w-5 h-5 text-neon-green" />
              <h2 className="text-xl font-bold text-white">Submit Flag</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="Cytutor{...}"
                className="w-full p-3 bg-black/40 border border-gray-700 rounded-lg text-white font-mono focus:border-neon-green focus:outline-none transition-colors"
                disabled={isCompleted}
              />
              <button
                type="submit"
                disabled={submitting || !flagInput.trim() || isCompleted}
                className="w-full px-4 py-3 bg-neon-green text-black rounded-lg font-bold hover:bg-neon-green-dark hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompleted ? 'Already Completed ✓' : submitting ? 'Submitting...' : 'Submit Flag'}
              </button>
            </form>
          </Card>

      {/* Floating toggle for the Scratch Terminal */}
      <button
        onClick={() => setTerminalOpen(true)}
        className={`fixed right-6 bottom-6 z-40 w-14 h-14 rounded-full bg-neon-green text-black shadow-[0_0_20px_rgba(34,197,94,0.5)] flex items-center justify-center hover:scale-105 transition-all ${terminalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="Open Scratch Terminal"
      >
        <Terminal className="w-6 h-6" />
      </button>

      {/* Slide-in Scratch Terminal panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full z-50 transform transition-transform duration-300 ${terminalOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ maxWidth: '100vw', width: window.innerWidth < 640 ? '100%' : terminalWidth }}
      >
        <div className="relative h-full bg-[#0d1117] border-l border-gray-700 shadow-2xl flex flex-col">
          {/* Resize handle */}
          <div
            onMouseDown={startResize}
            className="block sm:hidden absolute -left-1.5 top-0 h-full w-3 cursor-col-resize group z-10"
            title="Drag to resize"
          >
            <div className="mx-auto h-full w-0.5 bg-gray-700 group-hover:bg-neon-green transition-colors" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#161b22]">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-neon-green" />
              <span className="text-white font-bold text-sm">Terminal</span>
            </div>
            <button onClick={() => setTerminalOpen(false)} className="text-gray-400 hover:text-white transition-colors" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 p-3">
            <ScratchTerminal heightClassName="h-full" currentChallengeId={challenge.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetail;
