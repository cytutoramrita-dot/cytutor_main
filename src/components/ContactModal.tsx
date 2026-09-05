import React, { useEffect } from 'react';
import { X, Mail, Compass, Users, Heart } from 'lucide-react';

const CONTACT_EMAIL = 'cytutor@cb.amrita.edu';
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

const guide = 'Mr. Saurabh Shrivastava';

const contributors: string[] = [
  'Ashrita Nunna',
  'Sree Chandhan',
  'Tejas',
  'Hansica',
  'Kavya',
  'Sreedhar',
  'Sanjeev',
  'Mythri',
];

const specialThanks: string[] = [
  'Mr. Anand R Nair',
  'Ms. Vaishnavi K',
];

const initialsOf = (name: string) =>
  name
    .replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface ContactModalProps {
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose }) => {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="scrollbar-hide bg-bg-dark border border-neon-green/20 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-bg-dark z-10">
          <h2 className="text-xl font-bold text-white">Contact Us</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-10">
          {/* Contact */}
          <div className="text-center">
            <p className="text-gray-400 mb-6">Questions, feedback, or ideas? We'd love to hear from you.</p>
            <a
              href={GMAIL_COMPOSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-4 glass-panel px-6 py-4 rounded-2xl border border-white/5 hover:border-neon-green/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-neon-green" />
              </div>
              <span className="text-lg font-bold text-white">{CONTACT_EMAIL}</span>
            </a>
          </div>

          {/* Guide */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Compass className="w-5 h-5 text-neon-green" />
              <h3 className="text-lg font-bold text-white">Guide</h3>
            </div>
            <div className="max-w-[10rem]">
              <div className="glass-panel p-4 rounded-xl border border-neon-green/20 text-center">
                <div className="w-12 h-12 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm mb-2 mx-auto">
                  {initialsOf(guide)}
                </div>
                <p className="font-bold text-white text-sm">{guide}</p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-5 h-5 text-neon-green" />
              <h3 className="text-lg font-bold text-white">Team</h3>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-2 gap-4">
              {contributors.map((name) => (
                <div key={name} className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                  <div className="w-12 h-12 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm mb-2 mx-auto">
                    {initialsOf(name)}
                  </div>
                  <p className="font-bold text-white text-sm">{name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Special Thanks */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="w-5 h-5 text-neon-green" />
              <h3 className="text-lg font-bold text-white">Special Thanks</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
              {specialThanks.map((name) => (
                <div key={name} className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center mb-2 mx-auto">
                    <Heart className="w-5 h-5 text-neon-green" />
                  </div>
                  <p className="font-bold text-white text-sm">{name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Mentor</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
