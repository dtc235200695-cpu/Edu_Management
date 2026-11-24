// frontend/src/pages/LearningPath.tsx
import React, { useState, useEffect } from 'react';
import { fetchLearningPath, updatePathStatus, fetchStudents, getErrorMessage } from '../api';
import { LearningPathItem, Student } from '../types';
import { 
  Compass, 
  BookOpen, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  Target
} from 'lucide-react';

interface LearningPathProps {
  initialStudentId?: string;
  isStudent?: boolean;
}

export const LearningPath: React.FC<LearningPathProps> = ({ initialStudentId, isStudent = false }) => {
  const [studentId, setStudentId] = useState<string>(initialStudentId || '');
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [pathItems, setPathItems] = useState<LearningPathItem[]>([]);
  const [dataMode, setDataMode] = useState<'synthetic_demo' | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudentId) setStudentId(initialStudentId);
    if (isStudent || initialStudentId) return;
    fetchStudents({ limit: 50 }).then(res => {
      if (res.success && res.students.length > 0) {
        setStudentList(res.students);
        if (res.students[0]) {
          setStudentId(res.students[0].student_id);
        }
      }
    }).catch((cause: unknown) => {
      setError(getErrorMessage(cause, 'Không thể tải danh sách sinh viên.'));
      setLoading(false);
    });
  }, [initialStudentId, isStudent]);

  useEffect(() => {
    if (studentId) {
      loadPath(studentId);
    } else {
      setLoading(false);
    }
  }, [studentId]);

  const loadPath = async (id: string) => {
    setLoading(true);
    setError(null);
    setDataMode(null);
    setPathItems([]);
    try {
      const res = await fetchLearningPath(id);
      if (res.success) {
        setPathItems(res.learning_path || []);
        setDataMode(res.data_mode || null);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, 'Không thể tải lộ trình học tập.'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: LearningPathItem) => {
    const nextStatus = item.status === 'Đã hoàn thành' ? 'Chưa hoàn thành' : 'Đã hoàn thành';
    setUpdatingId(item.path_id);
    try {
      if (item.path_id) {
        await updatePathStatus(item.path_id, nextStatus);
      }
      // Cập nhật state local
      setPathItems(prev => prev.map(p => p.path_id === item.path_id ? { ...p, status: nextStatus } : p));
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể cập nhật trạng thái.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const completedCount = pathItems.filter(p => p.status === 'Đã hoàn thành').length;
  const progressPercent = pathItems.length > 0 ? Math.round((completedCount / pathItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Student Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Cá nhân hóa lộ trình học tập</h3>
            <p className="text-xs text-slate-500">
              {dataMode === 'synthetic_demo'
                ? 'Lộ trình DEMO được xây dựng từ điểm mô phỏng; không dùng để đánh giá sinh viên thật.'
                : 'Được sinh tự động dựa trên kết quả kiểm tra từng chủ đề'}
            </p>
          </div>
        </div>

        {/* Staff can select a student; students are fixed to their own account. */}
        {!isStudent && <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-600">Chọn sinh viên:</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {studentList.map(s => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_id} - {s.full_name}{s.class_name ? ` (${s.class_name})` : ''}
              </option>
            ))}
          </select>
        </div>}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {dataMode === 'synthetic_demo' && (
        <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Dữ liệu lộ trình là dữ liệu mô phỏng DEMO, không phải kết quả học tập thật.
        </p>
      )}

      {/* Progress Card */}
      {!error && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiến độ hoàn thành lộ trình</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                Đã hoàn thành {completedCount} / {pathItems.length} chủ đề ({progressPercent}%)
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-sm rounded-full border border-blue-100">
              Học kỳ 1 • Điện toán đám mây
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mt-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Learning Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <span className="text-sm text-slate-500 font-medium">Đang xây dựng lộ trình thích ứng...</span>
          </div>
        ) : error ? null : pathItems.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400">
            Chưa có chủ đề nào trong lộ trình của sinh viên này.
          </div>
        ) : (
          pathItems.map((item, idx) => {
            const isCompleted = item.status === 'Đã hoàn thành';
            const priorityBadge = {
              'Ưu tiên cao': 'bg-red-50 text-red-700 border-red-200',
              'Ưu tiên trung bình': 'bg-amber-50 text-amber-700 border-amber-200',
              'Ưu tiên thấp': 'bg-blue-50 text-blue-700 border-blue-200',
              'Mở rộng': 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }[item.priority] || 'bg-slate-50 text-slate-700 border-slate-200';

            return (
              <div 
                key={idx} 
                className={`bg-white rounded-xl border transition-all p-5 shadow-2xs ${
                  isCompleted ? 'border-slate-200 bg-slate-50/40 opacity-80' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      disabled={updatingId === item.path_id}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                    >
                      {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className={`text-base font-bold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {item.topic_name}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${priorityBadge}`}>
                          {item.priority}
                        </span>
                        {item.current_score !== undefined && (
                          <span className="text-xs text-slate-500 font-medium">
                            (Điểm hiện tại: <strong className="text-slate-800">{item.current_score}/10</strong>)
                          </span>
                        )}
                      </div>

                      {/* Target Goal */}
                      {item.target_goal && (
                        <p className="text-xs text-slate-600 flex items-center space-x-1.5 mt-1 font-medium">
                          <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Mục tiêu: {item.target_goal}</span>
                        </p>
                      )}

                      {/* Learning Materials */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                        <div className="text-slate-700">
                          <strong className="text-slate-900">Tài liệu học tập:</strong> {item.learning_materials || 'Slide bài giảng lý thuyết và tài liệu hướng dẫn cơ bản.'}
                        </div>
                        <div className="text-slate-700">
                          <strong className="text-slate-900">Bài tập luyện tập:</strong> {item.practice_exercises || 'Bộ câu hỏi trắc nghiệm và bài thực hành mẫu có đáp án.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resource Link Button */}
                  <div className="shrink-0">
                    <a
                      href={item.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Tài liệu</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
