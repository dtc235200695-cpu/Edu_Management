// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { PageId, UserRole, UserPersona, USER_PERSONAS } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardOverview } from './pages/DashboardOverview';
import { StudentManagement } from './pages/StudentManagement';
import { DataAnalytics } from './pages/DataAnalytics';
import { MLPrediction } from './pages/MLPrediction';
import { LearningPath } from './pages/LearningPath';
import { DataManagement } from './pages/DataManagement';
import { MLModelManagement } from './pages/MLModelManagement';
import { SystemSettings } from './pages/SystemSettings';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('eduinsight_auth');
  });

  const [currentUser, setCurrentUser] = useState<UserPersona>(() => {
    try {
      const saved = localStorage.getItem('eduinsight_auth');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignored
    }
    return USER_PERSONAS.lecturer;
  });

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedStudentForPath, setSelectedStudentForPath] = useState<string>(() => {
    return currentUser?.studentId || 'SV2026';
  });
  const [headerSearch, setHeaderSearch] = useState<string>('');

  const pageTitleMap: Record<PageId, string> = {
    'dashboard': 'Dashboard tổng quan',
    'students': 'Quản lý sinh viên',
    'analytics': 'Phân tích dữ liệu học tập',
    'prediction': 'Dự đoán kết quả bằng Machine Learning',
    'learning-path': 'Cá nhân hóa lộ trình học tập',
    'data-management': 'Quản lý dữ liệu & Lưu trữ R2',
    'ml-model': 'Quản lý mô hình Machine Learning',
    'settings': 'Cài đặt hệ thống'
  };

  const handleLoginSuccess = (user: UserPersona) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.role === 'student' && user.studentId) {
      setSelectedStudentForPath(user.studentId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eduinsight_auth');
    setIsAuthenticated(false);
  };

  const handleNavigateToPath = (studentId: string) => {
    setSelectedStudentForPath(studentId);
    setCurrentPage('learning-path');
  };

  const handleNavigateToStudent = (studentId: string) => {
    setCurrentPage('students');
  };

  const handleSwitchRole = (newRole: UserRole) => {
    const newPersona = USER_PERSONAS[newRole];
    setCurrentUser(newPersona);
    localStorage.setItem('eduinsight_auth', JSON.stringify(newPersona));
    if (newRole === 'student') {
      setSelectedStudentForPath('SV2026');
    }
  };

  const handleHeaderSearchChange = (query: string) => {
    setHeaderSearch(query);
    if (query && currentPage !== 'students') {
      setCurrentPage('students');
    }
  };

  // If not authenticated, render LoginPage
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Responsive Drawer Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        onSelectPage={(p) => {
          setCurrentPage(p);
          setIsMobileMenuOpen(false);
        }} 
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area - Responsive with no fixed margin on mobile */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        <Header 
          pageTitle={pageTitleMap[currentPage]} 
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          onSearchChange={handleHeaderSearchChange}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {currentPage === 'dashboard' && (
            <DashboardOverview 
              onNavigateToStudent={handleNavigateToStudent}
              onNavigateToPath={handleNavigateToPath}
            />
          )}

          {currentPage === 'students' && (
            <StudentManagement 
              onNavigateToPath={handleNavigateToPath} 
              currentUser={currentUser}
              initialSearch={headerSearch}
            />
          )}

          {currentPage === 'analytics' && <DataAnalytics />}

          {currentPage === 'prediction' && <MLPrediction />}

          {currentPage === 'learning-path' && (
            <LearningPath initialStudentId={selectedStudentForPath} />
          )}

          {currentPage === 'data-management' && (
            <DataManagement onNavigateToStudents={() => setCurrentPage('students')} />
          )}

          {currentPage === 'ml-model' && <MLModelManagement />}

          {currentPage === 'settings' && <SystemSettings />}
        </main>
      </div>
    </div>
  );
};
export default App;
