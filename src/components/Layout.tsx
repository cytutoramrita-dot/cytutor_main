import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Book, User, Layout as LayoutIcon, LogOut, Terminal, Menu, X, GraduationCap, Mail, Users, Route as RouteIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ParticleBackground from './ParticleBackground';
import { User as UserType } from '../types';
import { classrooms as classroomsApi } from '../services/api';
import * as communityApi from '../services/communityApi';

interface LayoutProps {
  children?: React.ReactNode;
  user: UserType | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [communityPendingCount, setCommunityPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchPending = () => {
      classroomsApi.getPending()
        .then(list => setPendingCount(list.length))
        .catch(() => {}); // 403 for non-admins — badge simply stays at 0
    };
    fetchPending();
    window.addEventListener('classroom-pending-updated', fetchPending);
    return () => window.removeEventListener('classroom-pending-updated', fetchPending);
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchCommunityPending = () => {
      communityApi.getMyPendingRequestCount()
        .then(count => setCommunityPendingCount(count))
        .catch(() => {}); // not a leader of anything — badge simply stays at 0
    };
    fetchCommunityPending();
    window.addEventListener('community-pending-updated', fetchCommunityPending);
    return () => window.removeEventListener('community-pending-updated', fetchCommunityPending);
  }, [user?.id, location.pathname]);

  // If no user, just render children (likely login page or landing page)
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden font-sans selection:bg-neon-green selection:text-black" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <ParticleBackground />
        <div className="relative z-10">
          {children || <Outlet />}
        </div>
      </div>
    );
  }

  const displayName = user.username || user.fullName || user.email.split('@')[0];
  const avatarLabel = displayName.substring(0, 2).toUpperCase();

  const navItems = [
    { icon: LayoutIcon, label: 'Dashboard', path: '/dashboard' },
    { icon: Terminal, label: 'Challenges', path: '/challenges' },
    { icon: Book, label: 'Learn', path: '/materials' },
    { icon: RouteIcon, label: 'Paths', path: '/learning-paths' },
    { icon: GraduationCap, label: 'Classroom', path: '/classrooms' },
    { icon: Users, label: 'Communities', path: '/communities' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Mail, label: 'Contact Us', path: '/contact-us' },
  ];

  const badgeCounts: Record<string, number> = {
    '/classrooms': pendingCount,
    '/communities': communityPendingCount,
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans selection:bg-neon-green selection:text-black" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <ParticleBackground />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-neon-green/20">
        {/* Full width, not max-w-7xl — 3 logos + 7 nav links + user block need the whole */}
        {/* window's space, not just a centered 1280px column with wasted margins */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo + Nav grouped together, nudged in from the edge so the */}
            {/* wide gap left by justify-between isn't wasted purely on the right */}
            <div className="flex items-center gap-5 min-w-0 ml-10">
              <div className="flex items-center space-x-2.5 shrink-0">
                <img src="/amrita-logo.png" alt="Amrita Vishwa Vidyapeetham" className="h-8 w-auto shrink-0" />
                <img src="/tifac-logo.png" alt="TIFAC-CORE in Cyber Security" className="h-[51px] w-auto shrink-0" />

                {/* Logo Area - Links to Dashboard */}
                <Link to="/dashboard" className="flex items-center group shrink-0">
                   <img src="/cytutor-logo.jpeg" alt="CyTutor" className="h-14 w-auto rounded-md group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all" />
                </Link>
              </div>

              {/* Desktop Navigation (Visible on Desktop, Hidden on Mobile/Tablet) */}
              {/* Using Desktop First: flex (default), 2xl:hidden (below 1536px) — 3 logos + */}
              {/* 7 links + user block need more room than 1280px, so this collapses at 2xl */}
              {/* instead of xl to avoid crowding/wrapping */}
              <nav className="flex items-center space-x-1 2xl:hidden">
                 {navItems.map((item) => {
                   const itemBadgeCount = badgeCounts[item.path] ?? 0;
                   const hasBadge = itemBadgeCount > 0;
                   return (
                     <Link
                       key={item.path}
                       to={item.path}
                       className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                         location.pathname === item.path
                           ? 'bg-neon-green/10 text-neon-green border border-neon-green/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                           : 'text-gray-400 hover:text-white hover:bg-white/5'
                       }`}
                     >
                       <div className="relative">
                         <item.icon className={`w-3.5 h-3.5 ${location.pathname === item.path ? 'animate-pulse' : ''}`} />
                         {hasBadge && (
                           <span className="absolute -top-1.5 -right-1.5 min-w-[13px] h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                             {itemBadgeCount > 9 ? '9+' : itemBadgeCount}
                           </span>
                         )}
                       </div>
                       <span className="font-medium text-xs">{item.label}</span>
                     </Link>
                   );
                 })}
              </nav>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Desktop User Profile & Logout (Visible on Desktop, Hidden on Mobile/Tablet) */}
              <div className="flex items-center space-x-3 2xl:hidden shrink-0">
                 <div className="flex items-center space-x-2 pl-3 border-l border-white/10">
                    <div className="text-right max-w-[140px]">
                        <p className="text-xs font-bold text-white leading-none truncate" title={displayName}>{displayName}</p>
                        <p className="text-[10px] text-neon-green font-mono">Lvl {user.stats.level}</p>
                    </div>
                    <Link to="/profile">
                      <div className="w-8 h-8 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-xs border-2 border-transparent hover:border-neon-green transition-all cursor-pointer shadow-lg shadow-purple-500/20 shrink-0">
                          {user.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" /> : avatarLabel}
                      </div>
                    </Link>
                 </div>
                 <ThemeToggle />
                 <button
                   onClick={onLogout}
                   className="group p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 flex items-center gap-2 shrink-0"
                   title="Logout"
                 >
                   <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>

              {/* Mobile Menu Button (Hidden on Desktop, Visible below 1536px) */}
              <div className="hidden 2xl:flex">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown (Hidden on Desktop, Visible on Mobile when open) */}
        {mobileMenuOpen && (
           <div className="hidden 2xl:block border-t border-neon-green/20 bg-bg-dark/95 backdrop-blur-xl absolute w-full left-0 shadow-2xl animate-fade-in z-50">
              <div className="p-4 space-y-2">
                {navItems.map((item) => {
                  const itemBadgeCount = badgeCounts[item.path] ?? 0;
                  const hasBadge = itemBadgeCount > 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                        location.pathname === item.path
                          ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="relative">
                        <item.icon className="w-5 h-5" />
                        {hasBadge && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                            {itemBadgeCount > 9 ? '9+' : itemBadgeCount}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {hasBadge && <span className="ml-auto text-xs text-red-400 font-mono">{itemBadgeCount} pending</span>}
                    </Link>
                  );
                })}

                <div className="border-t border-white/10 my-4 pt-4">
                   <div className="flex items-center px-4 py-2 space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center font-bold text-white text-sm">
                          {avatarLabel}
                      </div>
                      <div>
                          <p className="text-sm font-bold text-white">{displayName}</p>
                          <p className="text-xs text-neon-green font-mono">Level {user.stats.level} Agent</p>
                      </div>
                   </div>
                   <ThemeToggle />
                   <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 text-left transition-colors"
                   >
                     <LogOut className="w-5 h-5" />
                     <span>Logout System</span>
                   </button>
                </div>
              </div>
           </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="max-w-7xl mx-auto p-8 md:p-4 pb-12">
            {children || <Outlet />}
          </div>
      </main>
    </div>
  );
};

export default Layout;
