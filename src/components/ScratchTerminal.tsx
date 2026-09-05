import React, { useRef, useState } from 'react';
import { runPipeline } from '../lib/scratchTerminalCommands';

interface Line {
  type: 'input' | 'output' | 'error';
  text: string;
}

const WELCOME: Line[] = [
  { type: 'output', text: "Scratch terminal — text tools run locally; 'start'/'stop'/'status' talk to real challenge instances. Type 'help' for commands." },
];

interface ScratchTerminalProps {
  /** Tailwind height class for the overall terminal window. Defaults to a fixed height for inline/card use. */
  heightClassName?: string;
  /** id of the challenge currently open, used as the default target for start/stop/status. */
  currentChallengeId?: string;
}

const ScratchTerminal: React.FC<ScratchTerminalProps> = ({ heightClassName = 'h-72', currentChallengeId }) => {
  const [lines, setLines] = useState<Line[]>(WELCOME);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));
  };

  const runCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    setLines((prev) => [...prev, { type: 'input', text: trimmed }]);

    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    setRunning(true);
    const { output, error } = await runPipeline(trimmed, { currentChallengeId });
    setLines((prev) => [...prev, { type: error ? 'error' : 'output', text: output }]);
    setRunning(false);
    scrollToEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = input;
      setInput('');
      runCommand(value);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  };

  return (
    <div
      className={`rounded-xl overflow-hidden bg-[#0d1117] border border-gray-700 shadow-xl flex flex-col ${heightClassName}`}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="bg-[#161b22] px-4 py-3 border-b border-gray-700 flex items-center space-x-2 shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="ml-4 text-xs text-gray-500 font-mono">scratch@cytutor:~</div>
      </div>
      <div className="p-4 font-mono text-sm flex-1 min-h-0 overflow-y-auto">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all mb-1">
            {line.type === 'input' ? (
              <span className="text-neon-green">$ {line.text}</span>
            ) : (
              <span className={line.type === 'error' ? 'text-red-400' : 'text-gray-300'}>{line.text}</span>
            )}
          </div>
        ))}
        <div className="flex items-center text-neon-green">
          <span className="mr-2">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-neon-green placeholder-gray-600 disabled:opacity-50"
            placeholder={running ? 'running...' : "type a command, e.g. help"}
          />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default ScratchTerminal;
