import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Terminal, Target, Award, ArrowRight, Menu, X } from 'lucide-react';
import ParticleBackground from '../components/ParticleBackground';
import TerminalWindow from '../components/TerminalWindow';
import ContactModal from '../components/ContactModal';

const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="min-h-screen font-sans selection:bg-neon-green selection:text-black" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <ParticleBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-neon-green/20 backdrop-blur-md bg-black/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img src="/amrita-logo.png" alt="Amrita Vishwa Vidyapeetham" className="h-9 w-auto shrink-0" />
              <img src="/tifac-logo.png" alt="TIFAC-CORE in Cyber Security" className="h-10 w-auto shrink-0" />
              <img src="/cytutor-logo.jpeg" alt="CyTutor" className="h-12 w-auto shrink-0 rounded-md" />
            </div>

            {/* Desktop Nav */}
            <nav className="flex items-center space-x-8 md:hidden">
              <a href="#" className="text-gray-300 hover:text-neon-green transition-colors text-sm font-medium">Home</a>
              <a href="#features" className="text-gray-300 hover:text-neon-green transition-colors text-sm font-medium">Features</a>
              <Link to="/auth" className="text-gray-300 hover:text-neon-green transition-colors text-sm font-medium">Challenges</Link>
              
              <Link to="/auth" className="px-5 py-2 rounded-lg bg-neon-green text-black font-bold text-sm hover:bg-neon-green-dark transition-all transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                Login / Sign Up
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="hidden md:block p-2 text-gray-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="hidden md:block absolute w-full bg-bg-dark border-b border-white/10 p-4 space-y-4 shadow-xl z-50">
            <a href="#" className="block text-gray-300 py-2">Home</a>
            <a href="#features" className="block text-gray-300 py-2">Features</a>
            <Link to="/auth" className="block text-gray-300 py-2">Challenges</Link>
            <Link to="/auth" className="block w-full text-center px-5 py-3 rounded-lg bg-neon-green text-black font-bold">
              Login / Sign Up
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-12 md:pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-row md:flex-col items-center justify-between gap-12">
            
            {/* Hero Text */}
            <div className="w-1/2 md:w-full space-y-8 z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold uppercase tracking-wider mb-4">
                Free for Everyone
              </span>
              <h1 className="text-6xl md:text-4xl font-bold text-white leading-tight">
                Learn Cybersecurity <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-blue-500">by Doing.</span>
              </h1>
              <p className="text-xl md:text-lg text-gray-400 leading-relaxed max-w-lg">
                Master web security, cryptography, and forensics through interactive, hands-on challenges. No textbooks, just code.
              </p>
              <div className="flex flex-row sm:flex-col space-x-4 sm:space-x-0 sm:space-y-4">
                <Link to="/auth" className="px-8 py-4 rounded-xl bg-neon-green text-black font-bold text-lg flex items-center justify-center space-x-2 hover:bg-neon-green-dark transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                  <span>Start Learning Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/auth" className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 transition-all">
                  View Challenges
                </Link>
              </div>
            </div>

            {/* Terminal Visual */}
            <div className="w-1/2 md:w-full z-10">
               <TerminalWindow />
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Why CyTutor?</h2>
            <p className="text-gray-400">We believe the best way to learn security is to break things in a safe environment.</p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-1 gap-8">
            <div className="glass-panel p-8 rounded-2xl border border-white/5 hover:border-neon-green/30 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <Terminal className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Hands-On Labs</h3>
              <p className="text-gray-400 leading-relaxed">
                Practice real-world attack and defense scenarios. From SQL injection to XSS, learn by exploiting vulnerabilities in our sandboxed labs.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/5 hover:border-neon-green/30 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <Award className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Gamified Learning</h3>
              <p className="text-gray-400 leading-relaxed">
                Earn points, unlock badges, and climb the global leaderboard. Track your progress and streaks as you master new skills.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl border border-white/5 hover:border-neon-green/30 transition-all duration-300 group hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-neon-green/10 flex items-center justify-center mb-6 group-hover:bg-neon-green/20 transition-colors">
                <Target className="w-7 h-7 text-neon-green" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Guided Paths</h3>
              <p className="text-gray-400 leading-relaxed">
                Follow structured learning tracks designed by experts. Whether you're a beginner or advanced, there's a path for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="glass-panel rounded-3xl p-12 md:p-8 border border-neon-green/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50"></div>
            <h2 className="text-4xl md:text-3xl font-bold text-white mb-6">Ready to start your mission?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join thousands of others learning cybersecurity the right way. No credit card required.</p>
            <Link to="/auth" className="inline-flex px-8 py-4 rounded-xl bg-neon-green text-black font-bold text-lg items-center justify-center space-x-2 hover:bg-neon-green-dark transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              <span>Initialize Agent</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 relative z-10" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row md:flex-col justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-6">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="text-lg font-bold text-gray-500 font-mono">CyTutor</span>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => setShowContactModal(true)}
              className="text-gray-600 hover:text-neon-green text-sm transition-colors"
            >
              Contact Us
            </button>
            <p className="text-gray-600 text-sm">
              © 2025 TIFAC CORE Amrita
            </p>
          </div>
        </div>
      </footer>

      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
    </div>
  );
};

export default Landing;