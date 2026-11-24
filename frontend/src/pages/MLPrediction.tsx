// frontend/src/pages/MLPrediction.tsx
import React, { useState } from 'react';
import { getErrorMessage, predictOutcome } from '../api';
import { PredictResult } from '../types';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Info, 
  TrendingUp, 
  RefreshCw,
  Cpu,
  Sliders,
  ShieldAlert
} from 'lucide-react';

export const MLPrediction: React.FC = () => {
  const [formData, setFormData] = useState({
    student_id: '',
    attendance_rate: 0.85,
    study_hours: 12.0,
    assignment_score: 7.5,
    quiz_score: 7.0,
    completion_rate: 0.80,
    previous_score: 7.2
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await predictOutcome({
        student_id: formData.student_id || undefined,
        attendance_rate: Number(formData.attendance_rate),
        study_hours: Number(formData.study_hours),
        assignment_score: Number(formData.assignment_score),
        quiz_score: Number(formData.quiz_score),
        completion_rate: Number(formData.completion_rate),
        previous_score: Number(formData.previous_score)
      });
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'Lỗi khi gọi API Machine Learning');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa kết nối mô hình Machine Learning. Vui lòng kiểm tra lại Cloudflare Workers API.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">
              <Cpu className="w-4 h-4 text-blue-200" />
              <span>Chế độ DEMO • Ước tính minh họa</span>
            </div>
            <h2 className="text-2xl font-bold">Mô phỏng kết quả học tập</h2>
            <p className="text-sm text-blue-50 mt-1 max-w-2xl leading-relaxed">
              Kết quả được tính bằng công thức minh họa trên dữ liệu giả lập; không phải mô hình Machine Learning đã triển khai,
              không phản ánh sinh viên thật và không dùng cho quyết định học tập.
            </p>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-blue-500/30 text-white border border-blue-300/50 rounded-full text-xs font-medium">
            demo-heuristic-v1
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prediction Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <span>Tham số học tập đầu vào</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  student_id: '',
                  attendance_rate: 0.85,
                  study_hours: 12.0,
                  assignment_score: 7.5,
                  quiz_score: 7.0,
                  completion_rate: 0.80,
                  previous_score: 7.2
                });
                setResult(null);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Đặt lại mẫu
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mã sinh viên (tùy chọn) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã tham chiếu DEMO (tùy chọn; dự đoán không được lưu)
              </label>
              <input
                type="text"
                placeholder="VD: DEMO-0001"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 1. Tỷ lệ chuyên cần */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Tỷ lệ chuyên cần</span>
                <span className="text-blue-600 font-bold">{Math.round(formData.attendance_rate * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.01"
                value={formData.attendance_rate}
                onChange={(e) => setFormData({ ...formData, attendance_rate: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>40% (Nguy cơ)</span>
                <span>80% (Chuẩn)</span>
                <span>100% (Đầy đủ)</span>
              </div>
            </div>

            {/* 2. Số giờ tự học mỗi tuần */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Thời gian tự học mỗi tuần</span>
                <span className="text-blue-600 font-bold">{formData.study_hours} giờ/tuần</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="0.5"
                value={formData.study_hours}
                onChange={(e) => setFormData({ ...formData, study_hours: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>2h/w</span>
                <span>12h/w</span>
                <span>25h/w</span>
              </div>
            </div>

            {/* Grid 2 cột: Điểm bài tập & Điểm kiểm tra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Điểm bài tập */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Điểm bài tập (Lab)</span>
                  <span className="text-blue-600 font-bold">{formData.assignment_score}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={formData.assignment_score}
                  onChange={(e) => setFormData({ ...formData, assignment_score: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Điểm kiểm tra */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Điểm kiểm tra (Quiz)</span>
                  <span className="text-blue-600 font-bold">{formData.quiz_score}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={formData.quiz_score}
                  onChange={(e) => setFormData({ ...formData, quiz_score: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Grid 2 cột: Hoàn thành bài học & Điểm kỳ trước */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Hoàn thành bài học */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Tiến độ hoàn thành</span>
                  <span className="text-blue-600 font-bold">{Math.round(formData.completion_rate * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={formData.completion_rate}
                  onChange={(e) => setFormData({ ...formData, completion_rate: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Điểm kỳ trước */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Điểm kỳ trước (GPA)</span>
                  <span className="text-blue-600 font-bold">{formData.previous_score}/10</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.1"
                  value={formData.previous_score}
                  onChange={(e) => setFormData({ ...formData, previous_score: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang chạy suy luận Machine Learning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Dự đoán kết quả ngay</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prediction Results Display */}
        <div className="lg:col-span-5 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Chưa kết nối mô hình</h4>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Sẵn sàng dự đoán</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Điều chỉnh các tham số học tập ở bảng bên trái và nhấn nút "Dự đoán kết quả" để xem phân tích rủi ro.
              </p>
            </div>
          )}

          {result && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kết quả mô phỏng DEMO</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  Không phải ML thực tế
                </span>
              </div>

              {/* Main Score Display */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Điểm ước tính DEMO</span>
                  <div className="text-4xl font-extrabold text-slate-900 mt-1">
                    {result.predicted_score}
                    <span className="text-lg font-normal text-slate-400">/10</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium">Mức độ rủi ro</span>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      result.risk_level === 'Cao'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : result.risk_level === 'Trung bình'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      Nguy cơ {result.risk_level}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Chỉ số đạt môn tham khảo: <strong className="text-slate-800">{result.pass_probability}%</strong>
                  </span>
                </div>
              </div>

              {/* Action Advice */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                <h4 className="text-xs font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Khuyến nghị hành động tiếp theo:</span>
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                  {result.action_advice}
                </p>
              </div>

              {/* Weak factors breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Các yếu tố học tập cần cải thiện ({result.factors_to_improve.length})
                </h4>
                {result.factors_to_improve.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tất cả các chỉ số học tập đều đạt chuẩn tốt! Hãy tiếp tục duy trì.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {result.factors_to_improve.map((f, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-800">{f.factor}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            f.severity === 'Cao' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {f.severity}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Hiện tại: <strong className="text-slate-700">{f.current_value}</strong> | Mục tiêu: <strong className="text-emerald-700">{f.recommended}</strong>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1 font-medium italic">
                          ↳ {f.advice}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
