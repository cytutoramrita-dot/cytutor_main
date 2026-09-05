import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, onDismiss }) => {
  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-6 right-6 z-[9999] flex items-start space-x-3 px-4 py-4 rounded-xl shadow-2xl border max-w-sm w-full animate-fade-in-up ${
        isSuccess
          ? 'bg-green-500/15 border-green-500/40 text-green-400'
          : 'bg-red-500/15 border-red-500/40 text-red-400'
      }`}
      style={{ backgroundColor: isSuccess ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {isSuccess
          ? <CheckCircle className="w-5 h-5 text-green-400" />
          : <XCircle className="w-5 h-5 text-red-400" />
        }
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
        {message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
