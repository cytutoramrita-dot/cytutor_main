import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Compass, Users, Heart } from 'lucide-react';
import Card from '../components/ui/Card';

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

const ContactUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-gray-400 hover:text-white transition-colors flex items-center space-x-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Contact card */}
      <Card>
        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-neon-green">Contact Us</h1>
        <p className="text-gray-400 mt-1">Questions, feedback, or ideas? We'd love to hear from you.</p>

        <a
          href={GMAIL_COMPOSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center space-x-4 bg-white/5 border border-white/10 hover:border-neon-green/30 px-5 py-4 rounded-xl transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-lg bg-neon-green/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-neon-green" />
          </div>
          <span className="text-lg font-bold text-white">{CONTACT_EMAIL}</span>
        </a>
      </Card>

      {/* Guide */}
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <Compass className="w-5 h-5 text-neon-green" />
          <h2 className="text-lg font-bold text-white">Guide</h2>
        </div>
        <div className="max-w-[10rem]">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
            <div className="w-12 h-12 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm mb-2 mx-auto">
              {initialsOf(guide)}
            </div>
            <p className="font-bold text-white text-sm">{guide}</p>
          </div>
        </div>
      </Card>

      {/* Team */}
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-neon-green" />
          <h2 className="text-lg font-bold text-white">Team</h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-2 gap-4">
          {contributors.map((name) => (
            <div key={name} className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
              <div className="w-12 h-12 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm mb-2 mx-auto">
                {initialsOf(name)}
              </div>
              <p className="font-bold text-white text-sm">{name}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Special Thanks */}
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <Heart className="w-5 h-5 text-neon-green" />
          <h2 className="text-lg font-bold text-white">Special Thanks</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
          {specialThanks.map((name) => (
            <div key={name} className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
              <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center mb-2 mx-auto">
                <Heart className="w-5 h-5 text-neon-green" />
              </div>
              <p className="font-bold text-white text-sm">{name}</p>
              <p className="text-gray-400 text-xs mt-0.5">Mentor</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ContactUs;
