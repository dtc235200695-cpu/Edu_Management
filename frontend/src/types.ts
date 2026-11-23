// frontend/src/types.ts

export type PageId = 
  | 'dashboard'
  | 'students'
  | 'analytics'
  | 'prediction'
  | 'learning-path'
  | 'data-management'
  | 'ml-model'
  | 'settings';

export interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
  average_score?: number;
  attendance_rate?: number;
  study_hours?: number;
  completion_rate?: number;
  risk_level?: 'Thấp' | 'Trung bình' | 'Cao';
  predicted_score?: number;
  created_at?: string;
}

export interface DashboardOverview {
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

export interface PredictResult {
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
  algorithm_regression: string;
  algorithm_classification: string;
  trained_at: string;
  model_version: string;
  total_training_samples: number;
  features: string[];
  regression_metrics: {
    mae: number;
    rmse: number;
    r2_score: number;
    linear_baseline_r2: number;
  };
  classification_metrics: {
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    classes: string[];
    confusion_matrix: number[][];
  };
  feature_importances: Record<string, number>;
}
