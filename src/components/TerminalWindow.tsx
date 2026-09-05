import React, { useState, useEffect } from 'react';

const TerminalWindow: React.FC = () => {
  const [terminalText, setTerminalText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Terminal Typing Animation
  useEffect(() => {
    const textSequence = [
      "user@cytutor:~$ whoami\n",
      "cytutor_user\n",
      "user@cytutor:~$ ls challenges/\n",
      "web_hacking cryptography reverse_engineering forensics\n",
      "Pick a challenge to start learning..."
    ];
    
    let currentLine = 0;
    let currentChar = 0;
    let fullText = "";
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeWriter = () => {
      if (currentLine < textSequence.length) {
        const line = textSequence[currentLine];
        
        if (currentChar < line.length) {
          fullText += line.charAt(currentChar);
          setTerminalText(fullText);
          currentChar++;
          timeoutId = setTimeout(typeWriter, Math.random() * 50 + 50); // Random typing speed
        } else {
          currentLine++;
          currentChar = 0;
          timeoutId = setTimeout(typeWriter, 500); // Pause between lines
        }
      }
    };

    timeoutId = setTimeout(typeWriter, 1000); // Initial delay

    return () => clearTimeout(timeoutId);
  }, []);

  // Cursor Blinking
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(prev => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl overflow-hidden bg-[#0d1117] border border-gray-700 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
      {/* Terminal Header */}
      <div className="bg-[#161b22] px-4 py-3 border-b border-gray-700 flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="ml-4 text-xs text-gray-500 font-mono">user@cytutor:~</div>
      </div>
      {/* Terminal Body */}
      <div className="p-6 font-mono text-sm md:text-xs h-80 md:h-64 overflow-hidden">
        <div className="whitespace-pre-wrap text-blue-400">
          {terminalText}
          {showCursor && <span className="inline-block w-2.5 h-4 bg-gray-400 ml-1 align-middle"></span>}
        </div>
      </div>
    </div>
  );
};

export default TerminalWindow;