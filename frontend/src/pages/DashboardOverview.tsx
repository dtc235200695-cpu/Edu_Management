// frontend/src/pages/DashboardOverview.tsx
import React, { useEffect, useState } from 'react';
import { fetchOverview } from '../api';
import { DashboardOverview as DashboardData, PageId } from '../types';
import { 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  Filter, 
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface DashboardOverviewProps {
  onNavigateToStudent: (studentId: string) => void;
  onNavigateToPath: (studentId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  onNavigateToStudent,
  onNavigateToPath 
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOverview({
        class_name: selectedClass || undefined,
        course_id: selectedCourse || undefined
      });
      if (res.success) {
        setData(res);
      } else {
        setError(res.error || 'Không thể tải dữ liệu');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối tới máy chủ Cloudflare Workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedCourse]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Đang tải số liệu từ Cloudflare D1...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200 shadow-sm max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Không thể tải Dashboard</h3>
        <p className="text-sm text-slate-600 mt-1 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // Chuẩn bị dữ liệu cho biểu đồ phân bố điểm số
  const scoreDistChartData = [
    { name: '< 5.0 (Không đạt)', count: data?.score_distribution.under_5 || 0, fill: '#ef4444' },
    { name: '5.0 - 6.9 (Trung bình)', count: data?.score_distribution.range_5_7 || 0, fill: '#f59e0b' },
    { name: '7.0 - 8.4 (Khá)', count: data?.score_distribution.range_7_85 || 0, fill: '#3b82f6' },
    { name: '8.5 - 10 (Giỏi/Xuất sắc)', count: data?.score_distribution.range_85_10 || 0, fill: '#10b981' }
  ];

  // Chuẩn bị dữ liệu cho biểu đồ phân loại nguy cơ
  const riskColorMap: Record<string, string> = {
    'Cao': '#ef4444',
    'Trung bình': '#f59e0b',
    'Thấp': '#10b981'
  };

  const riskPieData = (data?.risk_distribution || []).map(r => ({
    name: `Nguy cơ ${r.risk_level}`,
    value: r.count,
    color: riskColorMap[r.risk_level] || '#64748b'
  }));

  const highRiskCount = data?.risk_distribution.find(r => r.risk_level === 'Cao')?.count || 0;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Bộ lọc dữ liệu:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả các lớp &amp; khoa</option>
            <optgroup label="Lọc theo Khóa học">
              <option value="K20">Khóa K20</option>
              <option value="K21">Khóa K21</option>
              <option value="K22">Khóa K22</option>
              <option value="K23">Khóa K23</option>
              <option value="K24">Khóa K24</option>
              <option value="K25">Khóa K25</option>
              <option value="K26">Khóa K26</option>
            </optgroup>
            <optgroup label="Lọc theo Khoa / Ngành">
              <option value="CNTT">Khoa CNTT (Công nghệ thông tin)</option>
              <option value="KTPM">Khoa KTPM (Kỹ thuật phần mềm)</option>
              <option value="KHMT">Khoa KHMT (Khoa học máy tính)</option>
              <option value="TTĐPT">Khoa TTĐPT (Truyền thông đa phương tiện)</option>
              <option value="KTĐT">Khoa KTĐT (Kỹ thuật điện tử)</option>
            </optgroup>
            <optgroup label="Danh sách lớp chi tiết">
              {data?.filter_options.classes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả môn học</option>
            {data?.filter_options.courses.map(crs => (
              <option key={crs.course_id} value={crs.course_id}>{crs.course_name}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Làm mới số liệu"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Responsive & Clean */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Tổng số sinh viên */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tight">Tổng sinh viên</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{data?.total_students}</p>
          <div className="flex items-center text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">
            <span>Toàn hệ thống</span>
          </div>
        </div>

        {/* Card 2: Khóa học */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tight">Số môn học</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{data?.total_courses}</p>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">Học kỳ 1</div>
        </div>

        {/* Card 3: Điểm trung bình */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tight">Điểm TB</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{data?.average_score}<span className="text-xs sm:text-sm font-normal text-slate-400">/10</span></p>
          <div className="text-[11px] sm:text-xs text-emerald-600 mt-1 font-medium">Trung bình khóa</div>
        </div>

        {/* Card 4: Tỷ lệ đạt môn */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tight">Tỷ lệ đạt môn</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">{data?.pass_rate}%</p>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">≥ 5.0 điểm</div>
        </div>

        {/* Card 5: Sinh viên có nguy cơ */}
        <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-tight">Nguy cơ học tập</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600 mt-2">{highRiskCount}</p>
          <div className="text-[11px] sm:text-xs text-red-500 mt-1 font-medium">Cần hỗ trợ sớm</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Biểu đồ phân bố điểm số */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Phân bố điểm cuối kỳ</h3>
              <p className="text-xs text-slate-500">Số lượng sinh viên theo từng thang điểm chuẩn</p>
            </div>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-5} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} sinh viên`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ tỷ lệ rủi ro */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1">Mức độ rủi ro học tập</h3>
          <p className="text-xs text-slate-500 mb-3">Phân loại bởi Machine Learning</p>
          <div className="h-52 sm:h-56 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} sinh viên`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table: Sinh viên cần hỗ trợ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Danh sách sinh viên cần hỗ trợ can thiệp</h3>
            <p className="text-xs text-slate-500">Các sinh viên có điểm dự đoán dưới 6.0 hoặc xếp loại Nguy cơ cao</p>
          </div>
          <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
            {data?.students_needing_support.length || 0} trường hợp
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Mã SV</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Lớp</th>
                <th className="px-5 py-3.5 text-center">Chuyên cần</th>
                <th className="px-5 py-3.5 text-center">Giờ tự học</th>
                <th className="px-5 py-3.5 text-center">Điểm thi dự đoán</th>
                <th className="px-5 py-3.5 text-center">Mức độ rủi ro</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.students_needing_support.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Không có sinh viên nào có nguy cơ trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                data?.students_needing_support.map((student) => (
                  <tr key={student.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{student.student_id}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{student.full_name}</td>
                    <td className="px-5 py-3.5">{student.class_name}</td>
                    <td className="px-5 py-3.5 text-center font-medium">
                      {Math.round(student.attendance_rate * 100)}%
                    </td>
                    <td className="px-5 py-3.5 text-center font-medium">
                      {student.study_hours} h/w
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {student.predicted_score}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        student.risk_level === 'Cao' 
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : student.risk_level === 'Trung bình'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {student.risk_level}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onNavigateToStudent(student.student_id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Hồ sơ
                      </button>
                      <button
                        onClick={() => onNavigateToPath(student.student_id)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-semibold transition-colors"
                      >
                        Lộ trình
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
