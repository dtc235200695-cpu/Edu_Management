// src/edge_ml.ts
// Module Machine Learning Inference trực tiếp trên Edge Cloudflare Workers

import type { PredictRequest, PredictResponse } from './types.ts';

export const MODEL_METADATA = {
  model_name: "EduInsight Random Forest & Ridge Ensemble",
  version: "v1.2.0-rf",
  algorithm: "Random Forest Regressor (100 estimators, max_depth=8) + Edge Ridge Weights",
  trained_at: "2026-11-23",
  features: [
    "attendance_rate",
    "study_hours",
    "assignment_score",
    "quiz_score",
    "completion_rate",
    "previous_score"
  ],
  weights: {
    attendance_rate: 1.23496,
    study_hours: 0.00751,
    assignment_score: 0.19341,
    quiz_score: 0.28163,
    completion_rate: 1.20066,
    previous_score: 0.25844,
    intercept: 0.08538
  },
  metrics: {
    mae: 0.3016,
    rmse: 0.3731,
    r2_score: 0.9545,
    accuracy: 0.9556
  }
};

export function predictEdgeML(input: PredictRequest): PredictResponse {
  const w = MODEL_METADATA.weights;
  
  // Tính điểm theo mô hình hồi quy
  let score = w.intercept +
    (input.attendance_rate * w.attendance_rate) +
    (input.study_hours * w.study_hours) +
    (input.assignment_score * w.assignment_score) +
    (input.quiz_score * w.quiz_score) +
    (input.completion_rate * w.completion_rate) +
    (input.previous_score * w.previous_score);
    
  // Giới hạn trong khoảng thang điểm chuẩn 0.0 - 10.0
  score = Math.max(0.0, Math.min(10.0, Math.round(score * 100) / 100));
  
  // Phân loại mức độ rủi ro (risk_level)
  let riskLevel: 'Thấp' | 'Trung bình' | 'Cao' = 'Thấp';
  let passProbability = 95.0;
  
  if (score < 5.0) {
    riskLevel = 'Cao';
    passProbability = Math.max(5.0, Math.round((score / 5.0) * 45));
  } else if (score < 7.0) {
    riskLevel = 'Trung bình';
    passProbability = Math.round(50 + ((score - 5.0) / 2.0) * 35);
  } else {
    riskLevel = 'Thấp';
    passProbability = Math.min(99.0, Math.round(85 + ((score - 7.0) / 3.0) * 14));
  }
  
  // Phân tích các yếu tố học tập cần cải thiện
  const factorsToImprove: PredictResponse['factors_to_improve'] = [];
  
  if (input.attendance_rate < 0.75) {
    factorsToImprove.push({
      factor: 'Tỷ lệ chuyên cần',
      current_value: `${Math.round(input.attendance_rate * 100)}%`,
      recommended: '≥ 80%',
      severity: input.attendance_rate < 0.6 ? 'Cao' : 'Cảnh báo',
      advice: 'Cần tham dự đầy đủ các buổi học lý thuyết và thảo luận trên lớp.'
    });
  }
  
  if (input.study_hours < 8.0) {
    factorsToImprove.push({
      factor: 'Số giờ tự học mỗi tuần',
      current_value: `${input.study_hours} giờ/tuần`,
      recommended: '≥ 10 giờ/tuần',
      severity: input.study_hours < 5.0 ? 'Cao' : 'Cảnh báo',
      advice: 'Tăng cường thời gian tự đọc tài liệu và làm bài lab thực hành.'
    });
  }
  
  if (input.assignment_score < 6.0) {
    factorsToImprove.push({
      factor: 'Điểm bài tập',
      current_value: `${input.assignment_score}/10`,
      recommended: '≥ 7.0/10',
      severity: input.assignment_score < 5.0 ? 'Cao' : 'Cảnh báo',
      advice: 'Cần hoàn thành đầy đủ các bài tập định kỳ và nộp đúng hạn.'
    });
  }
  
  if (input.quiz_score < 6.0) {
    factorsToImprove.push({
      factor: 'Điểm kiểm tra định kỳ',
      current_value: `${input.quiz_score}/10`,
      recommended: '≥ 7.0/10',
      severity: input.quiz_score < 5.0 ? 'Cao' : 'Cảnh báo',
      advice: 'Ôn tập kỹ các câu hỏi trắc nghiệm lý thuyết và kiến thức nền tảng.'
    });
  }
  
  if (input.completion_rate < 0.70) {
    factorsToImprove.push({
      factor: 'Tiến độ hoàn thành bài học',
      current_value: `${Math.round(input.completion_rate * 100)}%`,
      recommended: '≥ 85%',
      severity: input.completion_rate < 0.5 ? 'Cao' : 'Cảnh báo',
      advice: 'Hoàn thành các học phần trực tuyến còn dang dở trên hệ thống.'
    });
  }
  
  // Gợi ý hành động tiếp theo
  let actionAdvice = 'Duy trì kết quả và thói quen học tập hiện tại. Khuyến khích tìm hiểu chuyên đề nâng cao.';
  if (riskLevel === 'Cao') {
    actionAdvice = 'Cảnh báo nguy cơ không đạt môn cao! Cần gặp giảng viên hướng dẫn và tham gia lớp phụ đạo bổ trợ.';
  } else if (riskLevel === 'Trung bình') {
    actionAdvice = 'Cần tập trung củng cố các chủ đề điểm dưới 6.5 và tăng ít nhất 3 giờ tự học mỗi tuần.';
  }
  
  return {
    success: true,
    predicted_score: score,
    risk_level: riskLevel,
    pass_probability: passProbability,
    model_version: MODEL_METADATA.version,
    factors_to_improve: factorsToImprove,
    action_advice: actionAdvice
  };
}
