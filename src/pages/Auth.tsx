import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Lock, Mail, Shield } from 'lucide-react';
import Card from '../components/ui/Card';
import { auth, users } from '../services/api';
import { User } from '../types';

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

type AuthState = 'EMAIL' | 'LOGIN' | 'SIGNUP' | 'OTP' | 'RESET_PASSWORD';
type OtpPurpose = 'signup' | 'forgot_password';

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [state, setState] = useState<AuthState>('EMAIL');
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleBackToEmail = () => {
    setState('EMAIL');
    setPassword('');
    setOtp('');
    setNewPassword('');
    resetMessages();
  };

  const finalizeAuth = async (token: string) => {
    localStorage.setItem('cytutor_token', token);
    const userData = await users.getMe();
    onLoginSuccess(userData);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const result = await auth.checkEmail(email);

      if (result.exists) {
        setState('LOGIN');
        setInfo('Account found. Enter your password to continue.');
      } else {
        setState('SIGNUP');
        setInfo(result.requiresVerification ? 'Finish signup to verify your email.' : 'Create your password to continue.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to continue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const result = await auth.login(email, password);
      await finalizeAuth(result.token);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      await auth.register(email, password);
      setOtpPurpose('signup');
      setState('OTP');
      setOtp('');
      setInfo(`We sent a verification code to ${email}.`);
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    resetMessages();
    setIsLoading(true);

    try {
      await auth.forgotPassword(email);
      setOtpPurpose('forgot_password');
      setState('OTP');
      setOtp('');
      setInfo(`We sent a reset code to ${email}.`);
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      if (otpPurpose === 'signup') {
        const result = await auth.verifyOtp(email, otp);
        await finalizeAuth(result.token);
      } else {
        setState('RESET_PASSWORD');
        setInfo('OTP verified. Set your new password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      await auth.resetPassword(email, otp, newPassword);
      setState('LOGIN');
      setPassword('');
      setNewPassword('');
      setInfo('Password updated. Log in with your new password.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) {
      return;
    }

    resetMessages();
    setIsLoading(true);

    try {
      await auth.resendOtp(email, otpPurpose);
      setInfo(`A new code was sent to ${email}.`);
      setResendCountdown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBackButton = () => (
    <button
      type="button"
      onClick={handleBackToEmail}
      className="text-xs text-gray-500 hover:text-white underline flex items-center justify-center gap-1"
    >
      <ArrowLeft className="w-3 h-3" />
      <span>Change Email</span>
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="mb-8 text-center animate-fade-in-up">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-neon-green/10 mb-4 border border-neon-green/20 box-shadow-neon">
          <Shield className="w-12 h-12 text-neon-green" />
        </div>
        <h1 className="text-5xl md:text-4xl font-bold font-mono tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-blue-500">
          CyTutor
        </h1>
        <p className="text-gray-400">Master Cybersecurity through practice.</p>
      </div>

      <Card className="w-full max-w-md backdrop-blur-xl bg-black/60">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg text-neon-green text-sm">
            {info}
          </div>
        )}

        {state === 'EMAIL' && (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Start with your email</h2>
              <p className="text-sm text-gray-400">We&apos;ll route you to the right next step.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                  placeholder="agent@cytutor.com"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon-green hover:bg-neon-green-dark text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <span className="animate-pulse">Checking...</span> : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {state === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-sm text-gray-400">Enter your password for <span className="text-neon-green">{email}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon-green hover:bg-neon-green-dark text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-pulse">Authenticating...</span> : (
                <>
                  <span>Enter Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-gray-500 hover:text-white underline block w-full"
                disabled={isLoading}
              >
                Forgot password?
              </button>
              {renderBackButton()}
            </div>
          </form>
        )}

        {state === 'SIGNUP' && (
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
              <p className="text-sm text-gray-400">Set a password for <span className="text-neon-green">{email}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon-green hover:bg-neon-green-dark text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-pulse">Sending Code...</span> : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              {renderBackButton()}
            </div>
          </form>
        )}

        {state === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Enter your code</h2>
              <p className="text-sm text-gray-400">We sent a 6-digit OTP to <span className="text-neon-green">{email}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Verification Code</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-mono tracking-widest text-lg focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-neon-green hover:bg-neon-green-dark text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-pulse">Verifying...</span> : (
                <>
                  <span>{otpPurpose === 'signup' ? 'Verify and Continue' : 'Verify Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || resendCountdown > 0}
                className="text-xs text-gray-500 hover:text-white underline block w-full disabled:no-underline disabled:opacity-50"
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP'}
              </button>
              {renderBackButton()}
            </div>
          </form>
        )}

        {state === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Set a new password</h2>
              <p className="text-sm text-gray-400">Update the password for <span className="text-neon-green">{email}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-green transition-colors" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neon-green hover:bg-neon-green-dark text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <span className="animate-pulse">Resetting...</span> : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center">
              {renderBackButton()}
            </div>
          </form>
        )}
      </Card>

      <div className="mt-8 text-xs text-gray-600 font-mono">
        SYSTEM STATUS: ONLINE | ENCRYPTION: AES-256
      </div>
    </div>
  );
};

export default Auth;
