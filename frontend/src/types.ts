// frontend/src/types.ts

export type PageId = 
  | 'dashboard'
  | 'students'
  | 'analytics'
  | 'prediction'
  | 'learning-path'
  | 'data-management'
  | 'ml-model'
  | 'profile'
  | 'settings';

export interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
  is_seed_data?: boolean;
  average_score?: number;
  attendance_rate?: number;
  study_hours?: number;
  completion_rate?: number;
  risk_level?: 'Thấp' | 'Trung bình' | 'Cao';
  predicted_score?: number;
  created_at?: string;
}

export interface StudentInput {
  student_id: string;
  full_name: string;
  class_name: string;
  attendance_rate: string;
  study_hours: string;
  assignment_score: string;
  quiz_score: string;
  completion_rate: string;
  previous_score: string;
}

export interface LearningRecord {
  attendance_rate?: number;
  study_hours?: number;
  quiz_score?: number;
}

export interface TopicResult {
  topic_id: number;
  topic_name: string;
  score: number;
}

export interface StudentDetails {
  success: boolean;
  data_mode?: 'synthetic_demo';
  student: Student;
  learning_records: LearningRecord[];
  topic_results: TopicResult[];
  error?: string;
}

export interface StudentListResponse {
  success: boolean;
  data_mode?: 'synthetic_demo';
  students: Student[];
  pagination: {
    total_pages: number;
    total: number;
  };
  error?: string;
}

export interface DashboardOverview {
  data_mode?: 'synthetic_demo';
  total_students: number;
  total_courses: number;
  average_score: number;
  pass_rate: number;
  risk_distribution: Array<{ risk_level: string; count: number }>;
  score_distribution: {
    under_5: number;
    range_5_7: number;
    range_7_85: number;
    range_85_10: number;
  };
  students_needing_support: Array<{
    student_id: string;
    full_name: string;
    class_name: string;
    final_score: number;
    attendance_rate: number;
    study_hours: number;
    risk_level: string;
    predicted_score: number;
  }>;
  filter_options: {
    classes: string[];
    courses: Array<{ course_id: string; course_name: string }>;
  };
}

export interface AnalyticsPoint {
  student_id: string;
  study_hours?: number | string;
  attendance_pct?: number | string;
  final_score: number | string;
}

export interface TopicPerformance {
  topic_name: string;
  avg_score: number | string;
  weak_students_count: number | string;
}

export interface CourseScore {
  course_name: string;
  avg_score: number | string;
}

export interface AnalyticsResponse {
  success: boolean;
  data_mode?: 'synthetic_demo';
  study_hours_correlation: AnalyticsPoint[];
  attendance_correlation: AnalyticsPoint[];
  topic_performance: TopicPerformance[];
  course_scores: CourseScore[];
  error?: string;
}

export interface ImportRecord {
  student_id: string;
  [field: string]: string;
}

export interface ImportHistoryItem {
  import_id: string;
  filename: string;
  total_records: number | null;
  valid_records: number | null;
  invalid_records: number | null;
  r2_key?: string;
  size: number;
  created_at: string;
}

export interface ImportResult {
  filename: string;
  r2_key: string;
  size: number;
  uploaded_at: string;
}

export interface PredictResult {
  success: boolean;
  data_mode?: 'synthetic_demo';
  error?: string;
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
  learning_materials?: string;
  practice_exercises?: string;
}

export interface ModelInfo {
  model_name: string;
  data_mode?: 'synthetic_demo' | 'uploaded_csv';
  is_demo?: boolean;
  generated_risk_labels?: boolean;
  demo_labeled_copy?: boolean;
  demo_notice?: string;
  dataset_info?: {
    name: string;
    record_count: number;
    train_test_split: string;
    random_seed: number;
  };
  algorithm_regression: string | null;
  algorithm_classification: string;
  trained_at: string;
  model_version: string;
  total_training_samples: number;
  features: string[];
  regression_metrics: {
    mae: number;
    rmse: number;
    r2_score: number;
    baseline_r2: number;
  } | null;
  classification_metrics: {
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    classes: string[];
    confusion_matrix: number[][];
  };
  feature_importances: Record<string, number>;
  actual_vs_predicted?: Array<{
    actual: number;
    predicted: number;
  }>;
  metrics_notice?: string;
}

export type UserRole = 'lecturer' | 'student' | 'admin';
export type AccountRole = UserRole | 'pending';
export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface UserPersona {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  roleTitle: string;
  roleBadge: string;
  department: string;
  avatarText: string;
  studentId?: string;
  className?: string;
  mustChangePassword?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  studentId: string;
  status: AccountStatus;
  mustChangePassword: boolean;
  createdAt: string;
}

export const COHORTS = ['K20', 'K21', 'K22', 'K23', 'K24', 'K25', 'K26'] as const;

export const FACULTIES = [
  { code: 'CNTT', name: 'Công nghệ thông tin' },
  { code: 'KTPM', name: 'Kỹ thuật phần mềm' },
  { code: 'KHMT', name: 'Khoa học máy tính' },
  { code: 'TTĐPT', name: 'Truyền thông đa phương tiện' },
  { code: 'KTĐT', name: 'Kỹ thuật điện tử' },
  { code: 'ATTT', name: 'An toàn thông tin' },
  { code: 'HTTT', name: 'Hệ thống thông tin' },
  { code: 'DTVT', name: 'Điện tử viễn thông' }
] as const;

export const CLASS_NUMBERS = ['01', '02', '03', '04'] as const;
