import {
  AnalyticsResponse,
  DashboardOverview,
  ImportHistoryItem,
  ImportResult,
  LearningPathItem,
  ModelInfo,
  PredictResult,
  Student,
  StudentDetails,
  StudentInput,
  StudentListResponse,
  UserPersona,
  AccountRole,
  AccountStatus,
  AdminUser,
} from './types';

const API_BASE = '/api';

interface ApiResponse {
  success: boolean;
  error?: string;
}

export interface CloudflareHealth {
  success: true;
  database: 'connected';
  storage: 'connected';
  result: { connected: number };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
  });
  const result = await response.json().catch(() => null) as (ApiResponse & T) | null;

  if (!response.ok) {
    throw new Error(result?.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  if (result === null) {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }

  return result;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function fetchOverview(params?: { class_name?: string; course_id?: string }) {
  const query = new URLSearchParams();
  if (params?.class_name) query.set('class_name', params.class_name);
  if (params?.course_id) query.set('course_id', params.course_id);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return request<ApiResponse & DashboardOverview>(`/dashboard/overview${suffix}`);
}

export async function fetchStudents(params?: {
  search?: string;
  class_name?: string;
  cohort?: string;
  faculty?: string;
  risk_level?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return request<StudentListResponse>(`/students${suffix}`);
}

export async function fetchStudentDetails(id: string) {
  return request<StudentDetails>(`/students/${encodeURIComponent(id)}`);
}

export async function createStudent(data: StudentInput) {
  return request<ApiResponse>('/students', jsonRequest('POST', data));
}

export async function updateStudent(id: string, data: Pick<Student, 'full_name' | 'class_name'>) {
  return request<ApiResponse>(`/students/${encodeURIComponent(id)}`, jsonRequest('PUT', data));
}

export async function deleteStudent(id: string) {
  return request<ApiResponse>(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchAnalytics() {
  return request<AnalyticsResponse>('/analytics');
}

export async function predictOutcome(data: {
  student_id?: string;
  course_id?: string;
  attendance_rate: number;
  study_hours: number;
  assignment_score: number;
  quiz_score: number;
  completion_rate: number;
  previous_score: number;
}) {
  return request<PredictResult>('/predict', jsonRequest('POST', data));
}

export async function fetchLearningPath(studentId: string) {
  return request<ApiResponse & {
    data_mode?: 'synthetic_demo';
    learning_path: LearningPathItem[];
  }>(
    `/students/${encodeURIComponent(studentId)}/learning-path`,
  );
}

export async function updatePathStatus(
  pathId: number,
  status: LearningPathItem['status'],
) {
  return request<ApiResponse>(`/learning-path/${pathId}`, jsonRequest('PATCH', { status }));
}

export async function importData(file: File) {
  return request<ApiResponse & ImportResult>('/data/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  });
}

export async function fetchImportHistory() {
  return request<ApiResponse & { history: ImportHistoryItem[] }>('/data/import-history');
}

export async function fetchModelInfo(key: string) {
  const query = new URLSearchParams({ key });
  return request<ApiResponse & ModelInfo>(`/ml/model-info?${query.toString()}`);
}

export async function fetchCloudflareHealth() {
  return request<CloudflareHealth>('/cloudflare/health');
}

export async function loginApi(credentials: {
  identifier: string;
  password: string;
}) {
  return request<ApiResponse & { user?: UserPersona }>('/auth/login', jsonRequest('POST', credentials));
}

export async function fetchCurrentUser() {
  return request<{ user: UserPersona | null }>('/me');
}

export async function updateProfile(name: string) {
  return request<ApiResponse & { user?: UserPersona }>(
    '/profile',
    jsonRequest('PATCH', { name }),
  );
}

export async function fetchAppConfig() {
  return request<{
    googleEnabled: boolean;
    mailEnabled: boolean;
    missingSettings: string[];
  }>('/app-config');
}

export async function requestPasswordReset(identifier: string) {
  return request<ApiResponse & { message?: string }>(
    '/auth/forgot-password',
    jsonRequest('POST', { identifier }),
  );
}

export async function resetPassword(data: {
  identifier: string;
  code: string;
  newPassword: string;
}) {
  return request<ApiResponse & { message?: string }>(
    '/auth/reset-password',
    jsonRequest('POST', data),
  );
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  return request<ApiResponse & { user?: UserPersona }>(
    '/auth/change-password',
    jsonRequest('POST', data),
  );
}

export async function logoutApi() {
  const response = await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`Đăng xuất thất bại (HTTP ${response.status}).`);
  }
}

export async function fetchAdminUsers() {
  return request<ApiResponse & { users: AdminUser[] }>('/admin/users');
}

export async function createAdminUser(data: {
  email: string;
  name: string;
  role: Exclude<AccountRole, 'admin' | 'pending'>;
  studentId?: string;
}) {
  return request<ApiResponse & { user: AdminUser; emailSent: boolean; warning?: string }>(
    '/admin/users',
    jsonRequest('POST', data),
  );
}

export async function updateAdminUser(
  id: string,
  data: { role: AccountRole; status: AccountStatus; studentId?: string },
) {
  return request<ApiResponse & { user: AdminUser }>(
    `/admin/users/${encodeURIComponent(id)}`,
    jsonRequest('PATCH', data),
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
