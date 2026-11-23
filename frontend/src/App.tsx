// frontend/src/App.tsx
import React, { useState } from 'react';
import { PageId, UserRole, USER_PERSONAS } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './pages/DashboardOverview';
import { StudentManagement } from './pages/StudentManagement';
import { DataAnalytics } from './pages/DataAnalytics';
import { MLPrediction } from './pages/MLPrediction';
import { LearningPath } from './pages/LearningPath';
import { DataManagement } from './pages/DataManagement';
import { MLModelManagement } from './pages/MLModelManagement';
import { SystemSettings } from './pages/SystemSettings';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedStudentForPath, setSelectedStudentForPath] = useState<string>('SV2026');
  const [currentRole, setCurrentRole] = useState<UserRole>('lecturer');
  const [headerSearch, setHeaderSearch] = useState<string>('');

  const currentUser = USER_PERSONAS[currentRole];

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

  const handleNavigateToPath = (studentId: string) => {
    setSelectedStudentForPath(studentId);
    setCurrentPage('learning-path');
  };

  const handleNavigateToStudent = (studentId: string) => {
    setCurrentPage('students');
  };

  const handleSwitchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed Left */}
      <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />

      {/* Main Content Area - Offset by Sidebar width */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header 
          pageTitle={pageTitleMap[currentPage]} 
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          onSearchChange={handleHeaderSearchChange}
        />

        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
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
