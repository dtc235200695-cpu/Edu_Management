import React, { Suspense, useEffect, useState } from 'react';
import { changePassword, fetchCurrentUser, getErrorMessage, logoutApi } from './api';
import { PageId, UserPersona } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';

const DashboardOverview = React.lazy(() =>
  import('./pages/DashboardOverview').then(({ DashboardOverview }) => ({
    default: DashboardOverview,
  })),
);
const StudentManagement = React.lazy(() =>
  import('./pages/StudentManagement').then(({ StudentManagement }) => ({
    default: StudentManagement,
  })),
);
const DataAnalytics = React.lazy(() =>
  import('./pages/DataAnalytics').then(({ DataAnalytics }) => ({
    default: DataAnalytics,
  })),
);
const MLPrediction = React.lazy(() =>
  import('./pages/MLPrediction').then(({ MLPrediction }) => ({
    default: MLPrediction,
  })),
);
const LearningPath = React.lazy(() =>
  import('./pages/LearningPath').then(({ LearningPath }) => ({
    default: LearningPath,
  })),
);
const DataManagement = React.lazy(() =>
  import('./pages/DataManagement').then(({ DataManagement }) => ({
    default: DataManagement,
  })),
);
const MLModelManagement = React.lazy(() =>
  import('./pages/MLModelManagement').then(({ MLModelManagement }) => ({
    default: MLModelManagement,
  })),
);
const SystemSettings = React.lazy(() =>
  import('./pages/SystemSettings').then(({ SystemSettings }) => ({
    default: SystemSettings,
  })),
);

const pageTitleMap: Record<PageId, string> = {
  dashboard: 'Dashboard tổng quan',
  students: 'Quản lý sinh viên',
  analytics: 'Phân tích dữ liệu học tập',
  prediction: 'Dự đoán kết quả bằng Machine Learning',
  'learning-path': 'Cá nhân hóa lộ trình học tập',
  'data-management': 'Quản lý dữ liệu & Lưu trữ R2',
  'ml-model': 'Quản lý mô hình Machine Learning',
  settings: 'Cài đặt hệ thống',
};

const rolePages: Record<UserPersona['role'], PageId[]> = {
  student: ['dashboard', 'learning-path', 'prediction'],
  lecturer: [
    'dashboard',
    'students',
    'analytics',
    'prediction',
    'learning-path',
    'data-management',
    'ml-model',
  ],
  admin: [
    'dashboard',
    'students',
    'analytics',
    'prediction',
    'learning-path',
    'data-management',
    'ml-model',
    'settings',
  ],
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedStudentForPath, setSelectedStudentForPath] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then(({ user }) => {
        if (active) {
          setCurrentUser(user);
          if (user?.studentId) setSelectedStudentForPath(user.studentId);
        }
      })
      .catch((error: unknown) => {
        if (active) setAuthError(getErrorMessage(error, 'Không thể kết nối máy chủ.'));
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser && !rolePages[currentUser.role].includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [currentUser, currentPage]);

  const handleLoginSuccess = (user: UserPersona) => {
    setCurrentUser(user);
    setAuthError(null);
    if (user.studentId) setSelectedStudentForPath(user.studentId);
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logoutApi();
      setCurrentUser(null);
      setCurrentPage('dashboard');
    } catch (error) {
      setLogoutError(getErrorMessage(error, 'Không thể đăng xuất.'));
    }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    const result = await changePassword({ currentPassword, newPassword });
    if (result.user) setCurrentUser(result.user);
  };

  const handleNavigateToPath = (studentId: string) => {
    setSelectedStudentForPath(studentId);
    setCurrentPage('learning-path');
  };

  const handleNavigateToStudent = (studentId: string) => {
    setHeaderSearch(studentId);
    setCurrentPage('students');
  };

  const handleHeaderSearchChange = (query: string) => {
    setHeaderSearch(query);
    if (query && currentUser?.role !== 'student' && currentPage !== 'students') {
      setCurrentPage('students');
    }
  };
  const authWarning = new URLSearchParams(window.location.search).get('authWarning');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} initialError={authError || undefined} />;
  }

  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordPage
        onSubmit={handlePasswordChange}
        onLogout={() => void handleLogout()}
        logoutError={logoutError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        currentPage={currentPage}
        currentUser={currentUser}
        onSelectPage={setCurrentPage}
        onLogout={() => void handleLogout()}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header
          pageTitle={pageTitleMap[currentPage]}
          currentUser={currentUser}
          onSearchChange={handleHeaderSearchChange}
          onLogout={() => void handleLogout()}
        />
        {logoutError && (
          <div role="alert" className="mx-8 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {logoutError}
          </div>
        )}
        {authWarning === 'email_unavailable' && (
          <div role="alert" className="mx-8 mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Không gửi được mật khẩu tạm thời qua email. Đăng nhập Google vẫn hoạt động; nếu cần dùng mật khẩu, hãy thử chức năng đặt lại mật khẩu hoặc liên hệ quản trị viên.
          </div>
        )}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
                Đang tải trang...
              </div>
            }
          >
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
              <LearningPath
                initialStudentId={selectedStudentForPath || currentUser.studentId || ''}
                isStudent={currentUser.role === 'student'}
              />
            )}
            {currentPage === 'data-management' && <DataManagement />}
            {currentPage === 'ml-model' && <MLModelManagement />}
            {currentPage === 'settings' && currentUser.role === 'admin' && <SystemSettings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
