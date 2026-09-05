import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { disableScrollRestoration } from './utils/scrollConfig';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Materials from './pages/Materials';
import Course from './pages/Course';
import LearningPaths from './pages/LearningPaths';
import LearningPath from './pages/LearningPath';
import Challenges from './pages/Challenges';
import ChallengeDetail from './pages/ChallengeDetail';

import TutorialTemplate from './pages/TutorialTemplate';
import Landing from './pages/Landing';
import Classrooms from './pages/Classrooms';
import ClassroomDetail from './pages/ClassroomDetail';
import ClassroomManage from './pages/ClassroomManage';
import AssignmentDetail from './pages/AssignmentDetail';
import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import ContactUs from './pages/ContactUs';
import { User } from './types';
import { users } from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Disable automatic scroll restoration on app initialization
    disableScrollRestoration();
    
    const checkSession = async () => {
      const token = localStorage.getItem('cytutor_token');
      if (token) {
        try {
          const userData = await users.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user session", error);
          localStorage.removeItem('cytutor_token');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cytutor_token');
  };

  useEffect(() => {
    // Fired by the axios interceptor when an authenticated request comes back 401
    // (expired/invalid token) — clears session state so route guards redirect to /auth
    window.addEventListener('cytutor:unauthorized', handleLogout);
    return () => window.removeEventListener('cytutor:unauthorized', handleLogout);
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-neon-green font-mono">Loading System...</div>;

  return (
    <ThemeProvider>
    <HashRouter>
      {/* ScrollToTop must be inside Router but outside Routes */}
      <ScrollToTop />
      
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={
          user ? <Navigate to="/dashboard" /> : <Landing />
        } />

        {/* Auth Route */}
        <Route path="/auth" element={
          !user ? (
            <Auth onLoginSuccess={handleUpdateUser} />
          ) : (
            <Navigate to="/dashboard" />
          )
        } />

        {/* Protected Routes Wrapper */}
        <Route element={<Layout user={user} onLogout={handleLogout} />}>

          <Route path="/onboarding" element={
            user ? (
              <Onboarding user={user} onComplete={handleUpdateUser} />
            ) : (
              <Navigate to="/auth" />
            )
          } />

          <Route path="/dashboard" element={
            user ? <Dashboard user={user} onUpdateUser={handleUpdateUser} /> : <Navigate to="/auth" />
          } />

          <Route path="/profile" element={
            user ? <Profile user={user} /> : <Navigate to="/auth" />
          } />

          <Route path="/materials" element={
            user ? <Materials /> : <Navigate to="/auth" />
          } />

          <Route path="/course/:courseId" element={
            user ? <Course /> : <Navigate to="/auth" />
          } />

          <Route path="/learning-paths" element={
            user ? <LearningPaths /> : <Navigate to="/auth" />
          } />

          <Route path="/learning-paths/:pathId" element={
            user ? <LearningPath /> : <Navigate to="/auth" />
          } />

          <Route path="/challenges" element={
            user ? <Challenges /> : <Navigate to="/auth" />
          } />

          <Route path="/challenges/:id" element={
            user ? <ChallengeDetail /> : <Navigate to="/auth" />
          } />



          {/* Dynamic Tutorial Route */}
          <Route path="/tutorial/:id" element={
            user ? <TutorialTemplate /> : <Navigate to="/auth" />
          } />

          {/* Classroom Routes */}
          <Route path="/classrooms" element={
            user ? <Classrooms user={user} /> : <Navigate to="/auth" />
          } />
          <Route path="/classrooms/:id" element={
            user ? <ClassroomDetail user={user} /> : <Navigate to="/auth" />
          } />
          <Route path="/classrooms/:id/manage" element={
            user ? <ClassroomManage user={user} /> : <Navigate to="/auth" />
          } />
          <Route path="/assignments/:id" element={
            user ? <AssignmentDetail /> : <Navigate to="/auth" />
          } />

          {/* Community Routes */}
          <Route path="/communities" element={
            user ? <Communities user={user} /> : <Navigate to="/auth" />
          } />
          <Route path="/communities/:id" element={
            user ? <CommunityDetail user={user} /> : <Navigate to="/auth" />
          } />

          {/* Contact Us */}
          <Route path="/contact-us" element={
            user ? <ContactUs /> : <Navigate to="/auth" />
          } />

        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
    </ThemeProvider>
  );
};

export default App;
