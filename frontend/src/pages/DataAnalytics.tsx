// frontend/src/pages/DataAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { fetchAnalytics, getErrorMessage } from '../api';
import { AnalyticsResponse } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { 
  BarChart2, 
  TrendingUp, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Compass
} from 'lucide-react';

export const DataAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'correlation' | 'topics' | 'courses'>('correlation');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalytics();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Unable to load analytics:', getErrorMessage(err, 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang tổng hợp dữ liệu học tập từ D1...</p>
      </div>
    );
  }

  // Chuẩn bị dữ liệu Scatter: Giờ học vs Điểm số
  const studyScatterData = (data?.study_hours_correlation || []).map((d) => ({
    x: Number(d.study_hours),
    y: Number(d.final_score),
    id: d.student_id
  }));

  // Chuẩn bị dữ liệu Scatter: Chuyên cần vs Điểm số
  const attendanceScatterData = (data?.attendance_correlation || []).map((d) => ({
    x: Number(d.attendance_pct),
    y: Number(d.final_score),
    id: d.student_id
  }));

  // Chuẩn bị dữ liệu Radar theo chủ đề
  const topicRadarData = (data?.topic_performance || []).map((t) => ({
    subject: t.topic_name.length > 25 ? t.topic_name.substring(0, 22) + '...' : t.topic_name,
    fullName: t.topic_name,
    avg_score: Number(t.avg_score),
    weak_count: Number(t.weak_students_count)
  }));

  return (
    <div className="space-y-6">
      {/* Top Selector Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('correlation')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'correlation'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Phân tích tương quan</span>
          </button>

          <button
            onClick={() => setActiveTab('topics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'topics'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Điểm theo chủ đề</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'courses'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Điểm theo môn học</span>
          </button>
        </div>

        <button
          onClick={loadAnalytics}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Tải lại số liệu"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Correlation Analysis */}
      {activeTab === 'correlation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tương quan: Giờ học vs Điểm thi */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Thời gian tự học vs Điểm cuối kỳ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tương quan thuận: sinh viên học ≥ 15h/tuần đạt điểm cao hơn</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" name="Giờ học/tuần" unit="h" domain={[0, 25]} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Điểm cuối kỳ" unit="đ" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(val, name) => [val, name === 'Giờ học/tuần' ? 'Giờ tự học' : 'Điểm thi']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Scatter name="Sinh viên" data={studyScatterData} fill="#3b82f6" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tương quan: Chuyên cần vs Điểm thi */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tỷ lệ chuyên cần (%) vs Điểm cuối kỳ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Sinh viên có chuyên cần &lt; 70% có nguy cơ trượt môn cao</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" name="Chuyên cần" unit="%" domain={[40, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Điểm cuối kỳ" unit="đ" domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(val, name) => [val, name === 'Chuyên cần' ? 'Chuyên cần' : 'Điểm thi']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Scatter name="Sinh viên" data={attendanceScatterData} fill="#10b981" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Topic Performance */}
      {activeTab === 'topics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
            <h3 className="text-base font-bold text-slate-800 mb-1">Mạng lưới điểm theo chủ đề</h3>
            <p className="text-xs text-slate-500 mb-4">Mức độ thành thạo các module môn học</p>
            <div className="h-72 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={topicRadarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Radar name="Điểm TB" dataKey="avg_score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Topic Detail Bar Table */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Chi tiết điểm trung bình & sinh viên yếu theo chủ đề</h3>
            <p className="text-xs text-slate-500 mb-4">Các chủ đề có điểm thấp cần được bổ sung bài giảng phụ đạo</p>

            <div className="space-y-4">
              {data?.topic_performance.map((tp) => {
                const avg = Number(tp.avg_score);
                const weakCount = Number(tp.weak_students_count);
                return (
                  <div key={tp.topic_name} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-800 text-sm">{tp.topic_name}</span>
                      <div className="flex items-center space-x-3">
                        {weakCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-100">
                            {weakCount} SV cần hỗ trợ
                          </span>
                        )}
                        <span className="font-bold text-slate-900 text-sm">{avg}/10</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          avg < 5.0 ? 'bg-red-500' : avg < 7.0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (avg / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Courses Breakdown */}
      {activeTab === 'courses' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-base font-bold text-slate-800 mb-1">So sánh kết quả giữa các môn học</h3>
          <p className="text-xs text-slate-500 mb-6">Thống kê điểm trung bình và tỷ lệ chuyên cần theo từng học phần</p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.course_scores || []} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="course_name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(val, name) => [val, name === 'avg_score' ? 'Điểm trung bình' : 'Chuyên cần (%)']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="avg_score" name="Điểm trung bình (thang 10)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
