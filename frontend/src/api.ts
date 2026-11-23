// frontend/src/api.ts
// Client API gọi đến Cloudflare Workers Backend

const API_BASE = '/api';

async function handleResponse(res: Response) {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const json = await res.json();
      if (json && json.error) errorMsg = json.error;
    } catch {
      // Ignored
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchOverview(params?: { class_name?: string; course_id?: string }) {
  const query = new URLSearchParams();
  if (params?.class_name) query.set('class_name', params.class_name);
  if (params?.course_id) query.set('course_id', params.course_id);
  const res = await fetch(`${API_BASE}/dashboard/overview?${query.toString()}`);
  return handleResponse(res);
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
  if (params?.search) query.set('search', params.search);
  if (params?.class_name) query.set('class_name', params.class_name);
  if (params?.cohort) query.set('cohort', params.cohort);
  if (params?.faculty) query.set('faculty', params.faculty);
  if (params?.risk_level) query.set('risk_level', params.risk_level);
  if (params?.sort_by) query.set('sort_by', params.sort_by);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  const res = await fetch(`${API_BASE}/students?${query.toString()}`);
  return handleResponse(res);
}

export async function fetchStudentDetails(id: string) {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function createStudent(data: any) {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateStudent(id: string, data: any) {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteStudent(id: string) {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  return handleResponse(res);
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
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function fetchLearningPath(studentId: string) {
  const res = await fetch(`${API_BASE}/students/${encodeURIComponent(studentId)}/learning-path`);
  return handleResponse(res);
}

export async function updatePathStatus(pathId: number, status: string) {
  const res = await fetch(`${API_BASE}/learning-path/${pathId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function importData(records: any[], filename: string) {
  const res = await fetch(`${API_BASE}/data/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, filename })
  });
  return handleResponse(res);
}

export async function fetchImportHistory() {
  const res = await fetch(`${API_BASE}/data/import-history`);
  return handleResponse(res);
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/ml/model-info`);
  return handleResponse(res);
}
