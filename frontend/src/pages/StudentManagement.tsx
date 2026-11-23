// frontend/src/pages/StudentManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  fetchStudents, 
  fetchStudentDetails, 
  createStudent, 
  updateStudent, 
  deleteStudent 
} from '../api';
import { Student } from '../types';
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  RefreshCw,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface StudentManagementProps {
  onNavigateToPath: (studentId: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onNavigateToPath }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  // Modal states
  const [detailModalStudent, setDetailModalStudent] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    class_name: 'K19-CNTT01',
    attendance_rate: '0.85',
    study_hours: '12.0',
    assignment_score: '7.5',
    quiz_score: '7.0',
    completion_rate: '0.80',
    previous_score: '7.0'
  });

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await fetchStudents({
        search,
        class_name: selectedClass,
        risk_level: selectedRisk,
        sort_by: sortBy,
        page,
        limit: 12
      });
      if (res.success) {
        setStudents(res.students);
        setTotalPages(res.pagination.total_pages);
        setTotalStudents(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [search, selectedClass, selectedRisk, sortBy, page]);

  const handleOpenDetail = async (studentId: string) => {
    try {
      const res = await fetchStudentDetails(studentId);
      if (res.success) {
        setDetailModalStudent(res);
      }
    } catch (err) {
      alert('Không thể tải chi tiết sinh viên');
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sinh viên ${studentId}? Toàn bộ điểm và lộ trình sẽ bị xóa.`)) {
      return;
    }
    try {
      const res = await deleteStudent(studentId);
      if (res.success) {
        loadStudents();
      } else {
        alert(res.error || 'Lỗi khi xóa');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStudent) {
        const res = await updateStudent(editingStudent.student_id, {
          full_name: formData.full_name,
          class_name: formData.class_name
        });
        if (res.success) {
          setEditingStudent(null);
          loadStudents();
        } else {
          alert(res.error || 'Lỗi cập nhật');
        }
      } else {
        const res = await createStudent(formData);
        if (res.success) {
          const addedId = formData.student_id;
          setIsAddModalOpen(false);
          setNewlyAddedId(addedId);
          setSearch('');
          setSelectedClass('');
          setSelectedRisk('');
          setSortBy('newest');
          setPage(1);
          setFormData({
            student_id: '',
            full_name: '',
            class_name: 'K19-CNTT01',
            attendance_rate: '0.85',
            study_hours: '12.0',
            assignment_score: '7.5',
            quiz_score: '7.0',
            completion_rate: '0.80',
            previous_score: '7.0'
          });
          loadStudents();
        } else {
          alert(res.error || 'Lỗi thêm mới');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      student_id: s.student_id,
      full_name: s.full_name,
      class_name: s.class_name,
      attendance_rate: String(s.attendance_rate || 0.8),
      study_hours: String(s.study_hours || 10),
      assignment_score: '7.0',
      quiz_score: '7.0',
      completion_rate: String(s.completion_rate || 0.8),
      previous_score: '7.0'
    });
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã SV, họ tên..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none"
          >
            <option value="">Tất cả các lớp</option>
            <option value="K19-CNTT01">K19-CNTT01</option>
            <option value="K19-CNTT02">K19-CNTT02</option>
            <option value="K19-KTPM01">K19-KTPM01</option>
            <option value="K19-HTTT01">K19-HTTT01</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none"
          >
            <option value="">Mọi mức độ rủi ro</option>
            <option value="Cao">Nguy cơ cao</option>
            <option value="Trung bình">Nguy cơ trung bình</option>
            <option value="Thấp">An toàn (Thấp)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none"
          >
            <option value="newest">Sắp xếp: Mới nhất trước</option>
            <option value="id_asc">Sắp xếp: Mã SV (A-Z)</option>
            <option value="name_asc">Sắp xếp: Họ tên (A-Z)</option>
          </select>

          <button
            onClick={() => {
              setEditingStudent(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sinh viên</span>
          </button>
        </div>
      </div>

      {/* Alert Banner for Newly Added Student */}
      {newlyAddedId && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>
              Đã ghi nhận sinh viên <strong>{newlyAddedId}</strong> vào Cloudflare D1. Mô hình Machine Learning đã tính toán dự đoán và phân loại rủi ro ban đầu.
            </span>
          </div>
          <button 
            onClick={() => setNewlyAddedId(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 p-1 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Tìm thấy {totalStudents} sinh viên</span>
          <span>Trang {page} / {totalPages || 1}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Mã SV</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Lớp</th>
                <th className="px-5 py-3.5 text-center">Điểm TB</th>
                <th className="px-5 py-3.5 text-center">Chuyên cần</th>
                <th className="px-5 py-3.5 text-center">Tiến độ học</th>
                <th className="px-5 py-3.5 text-center">Mức rủi ro</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Đang tải danh sách sinh viên từ Cloudflare D1...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isNew = s.student_id === newlyAddedId;
                  return (
                  <tr 
                    key={s.student_id} 
                    className={`transition-colors ${
                      isNew 
                        ? 'bg-blue-50/80 border-l-4 border-blue-600 font-medium' 
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      <div className="flex items-center space-x-2">
                        <span>{s.student_id}</span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded font-semibold uppercase">
                            Mới thêm
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {s.full_name || 'Chưa cập nhật tên'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                        {s.class_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                      {s.average_score !== null && s.average_score !== undefined ? s.average_score : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {s.attendance_rate ? `${Math.round(s.attendance_rate * 100)}%` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${Math.round((s.completion_rate || 0.7) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {Math.round((s.completion_rate || 0.7) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.risk_level === 'Cao' 
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : s.risk_level === 'Trung bình'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {s.risk_level || 'Thấp'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenDetail(s.student_id)}
                        title="Xem hồ sơ & lịch sử"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(s)}
                        title="Sửa thông tin"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigateToPath(s.student_id)}
                        title="Lộ trình học tập"
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.student_id)}
                        title="Xóa sinh viên"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trang trước</span>
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Trang {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModalStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Hồ sơ học tập: {detailModalStudent.student.full_name}
                </h3>
                <p className="text-xs text-slate-500">Mã SV: {detailModalStudent.student.student_id} | Lớp: {detailModalStudent.student.class_name}</p>
              </div>
              <button 
                onClick={() => setDetailModalStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <span className="text-xs text-blue-600 font-medium">Chuyên cần</span>
                <p className="text-lg font-bold text-blue-900 mt-1">
                  {Math.round((detailModalStudent.learning_records[0]?.attendance_rate || 0.8) * 100)}%
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-center">
                <span className="text-xs text-emerald-600 font-medium">Giờ tự học/tuần</span>
                <p className="text-lg font-bold text-emerald-900 mt-1">
                  {detailModalStudent.learning_records[0]?.study_hours || 10} h
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-center">
                <span className="text-xs text-purple-600 font-medium">Điểm kiểm tra</span>
                <p className="text-lg font-bold text-purple-900 mt-1">
                  {detailModalStudent.learning_records[0]?.quiz_score || 7.0}/10
                </p>
              </div>
            </div>

            {/* Topic Results Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">Điểm đánh giá theo từng chủ đề:</h4>
              <div className="space-y-2">
                {detailModalStudent.topic_results.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có kết quả chủ đề chi tiết.</p>
                ) : (
                  detailModalStudent.topic_results.map((tr: any) => (
                    <div key={tr.topic_id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">{tr.topic_name}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        tr.score < 5.0 ? 'bg-red-100 text-red-700' :
                        tr.score < 7.0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {tr.score}/10
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => {
                  const sid = detailModalStudent.student.student_id;
                  setDetailModalStudent(null);
                  onNavigateToPath(sid);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Xem lộ trình cá nhân hóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveStudent} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Cập nhật sinh viên' : 'Thêm sinh viên mới'}
              </h3>
              <button 
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã sinh viên *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent}
                  placeholder="VD: SV2026_099"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn An"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp học *</label>
                <select
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="K19-CNTT01">K19-CNTT01</option>
                  <option value="K19-CNTT02">K19-CNTT02</option>
                  <option value="K19-KTPM01">K19-KTPM01</option>
                  <option value="K19-HTTT01">K19-HTTT01</option>
                </select>
              </div>

              {!editingStudent && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chuyên cần (0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={formData.attendance_rate}
                      onChange={(e) => setFormData({ ...formData, attendance_rate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giờ học/tuần</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={formData.study_hours}
                      onChange={(e) => setFormData({ ...formData, study_hours: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : (editingStudent ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
