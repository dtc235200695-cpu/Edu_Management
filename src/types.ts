// src/types.ts
// Định nghĩa kiểu dữ liệu cho toàn bộ hệ thống EduInsight Learning Analytics

export interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
  created_at?: string;
  average_score?: number;
  attendance_rate?: number;
  completion_rate?: number;
  risk_level?: 'Thấp' | 'Trung bình' | 'Cao';
}

export interface Course {
  course_id: string;
  course_name: string;
  semester: string;
}

export interface LearningRecord {
  record_id?: number;
  student_id: string;
  course_id: string;
  attendance_rate: number;
  study_hours: number;
  assignment_score: number;
  quiz_score: number;
  completion_rate: number;
  previous_score: number;
  final_score?: number | null;
  created_at?: string;
}

export interface TopicResult {
  topic_id?: number;
  student_id: string;
  course_id: string;
  topic_name: string;
  score: number;
}

export interface Prediction {
  prediction_id?: number;
  student_id: string;
  course_id: string;
  predicted_score: number;
  risk_level: 'Thấp' | 'Trung bình' | 'Cao';
  model_version: string;
  created_at?: string;
}

export interface LearningPathItem {
  path_id: number;
  student_id: string;
  course_id: string;
  topic_name: string;
  priority: 'Ưu tiên cao' | 'Ưu tiên trung bình' | 'Ưu tiên thấp' | 'Mở rộng';
  resource_url: string;
  status: 'Chưa hoàn thành' | 'Đang học' | 'Đã hoàn thành';
  current_score?: number;
  target_goal?: string;
  description?: string;
}

export interface Resource {
  resource_id?: number;
  topic_name: string;
  title: string;
  resource_url: string;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên sâu';
}

export interface ImportHistoryItem {
  import_id: number;
  filename: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  r2_key?: string;
  created_at: string;
}

export interface PredictRequest {
  student_id?: string;
  course_id?: string;
  attendance_rate: number;
  study_hours: number;
  assignment_score: number;
  quiz_score: number;
  completion_rate: number;
  previous_score: number;
}

export interface PredictResponse {
  success: boolean;
  predicted_score: number;
  risk_level: 'Thấp' | 'Trung bình' | 'Cao';
  pass_probability: number;
  model_version: string;
  factors_to_improve: Array<{
    factor: string;
    current_value: string;
    recommended: string;
    severity: 'Cao' | 'Cảnh báo' | 'Bình thường';
    advice: string;
  }>;
  action_advice: string;
  prediction_saved?: boolean;
}

export interface Env {
  DB: any; // Cloudflare D1 Database binding
  STORAGE?: any; // Cloudflare R2 Bucket binding
  AI?: any; // Cloudflare Workers AI binding
  ENVIRONMENT?: string;
}
