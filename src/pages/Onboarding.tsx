import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import Card from '../components/ui/Card';
import { Check, User as UserIcon, MapPin, Target, ChevronRight, ChevronLeft, Globe, Loader } from 'lucide-react';
import { detectLocation, detectTimezone } from '../services/locationService';
import { users } from '../services/api';

interface OnboardingProps {
  user: User;
  onComplete: (user: User) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    location: '',
    timezone: '',
    experienceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    interests: [] as string[],
    bio: '',
    goals: '',
    termsAccepted: false
  });

  // Initialize timezone on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      timezone: detectTimezone()
    }));
  }, []);

  const interestsList = [
    'Web Security', 'Cryptography', 'Digital Forensics',
    'Malware Analysis', 'Network Security', 'Reverse Engineering'
  ];

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const result = await detectLocation();
      setFormData(prev => ({
        ...prev,
        location: `${result.city}, ${result.country}`,
        timezone: result.timezone || prev.timezone
      }));
    } catch (error) {
      console.error("Failed to detect location", error);
      // Error handling visual could be added here
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const updatedProfile = await users.updateProfile({
        ...formData,
        isProfileComplete: true
      });
      onComplete(updatedProfile);
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to update profile:", error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh]">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-xs font-mono text-neon-green">
            <span>IDENTIFICATION</span>
            <span>SKILL ASSESSMENT</span>
            <span>OBJECTIVES</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-green transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-800 pb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><UserIcon /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Agent Identity</h2>
                  <p className="text-sm text-gray-400">Establish your digital persona.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 font-bold uppercase">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 font-bold uppercase">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green focus:outline-none"
                    placeholder="cipher_jane"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-500 font-bold uppercase">Location</label>
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="text-xs text-neon-green hover:underline flex items-center space-x-1"
                  >
                    {isDetecting ? <Loader className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                    <span>{isDetecting ? 'Detecting...' : 'Auto Detect'}</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-neon-green focus:outline-none"
                    placeholder="Unknown Origin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase">Time Zone</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-neon-green focus:outline-none"
                    placeholder="UTC"
                  />
                </div>
                <p className="text-xs text-gray-500">Used for streak calculation and event timing.</p>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="w-4 h-4 rounded bg-black border-white/20 accent-neon-green"
                />
                <label htmlFor="terms" className="text-sm text-gray-400">I accept the agency terms of service and privacy protocols.</label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleNext}
                  disabled={!formData.fullName || !formData.username || !formData.termsAccepted}
                  className="px-6 py-2 bg-neon-green text-black font-bold rounded-lg flex items-center space-x-2 hover:bg-neon-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next Phase</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-800 pb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Target /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Skill Assessment</h2>
                  <p className="text-sm text-gray-400">Calibrate difficulty settings.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase">Experience Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData({ ...formData, experienceLevel: level as any })}
                      className={`p-3 rounded-lg border text-sm font-bold capitalize transition-all ${formData.experienceLevel === level
                        ? 'bg-neon-green/20 border-neon-green text-neon-green'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-gray-500 font-bold uppercase">Areas of Interest</label>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map(interest => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${formData.interests.includes(interest)
                        ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <button onClick={handleBack} className="text-gray-400 hover:text-white flex items-center space-x-1">
                  <ChevronLeft className="w-4 h-4" /> <span>Back</span>
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-neon-green text-black font-bold rounded-lg flex items-center space-x-2 hover:bg-neon-green-dark"
                >
                  <span>Next Phase</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center space-x-3 mb-6 border-b border-gray-800 pb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Target /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Mission Brief</h2>
                  <p className="text-sm text-gray-400">Define your operational goals.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green focus:outline-none h-24 resize-none"
                  placeholder="Brief description of your background..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase">Learning Goals</label>
                <textarea
                  value={formData.goals}
                  onChange={e => setFormData({ ...formData, goals: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-green focus:outline-none h-24 resize-none"
                  placeholder="What specific skills do you hope to acquire?"
                />
              </div>

              <div className="flex justify-between pt-6">
                <button onClick={handleBack} className="text-gray-400 hover:text-white flex items-center space-x-1">
                  <ChevronLeft className="w-4 h-4" /> <span>Back</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-neon-green text-black font-bold rounded-lg flex items-center space-x-2 hover:bg-neon-green-dark shadow-[0_0_15px_rgba(34,197,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Initializing...' : 'Initialize Agent'}</span>
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
