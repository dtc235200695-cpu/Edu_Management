// frontend/src/pages/StudentManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  fetchStudents, 
  fetchStudentDetails, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  getErrorMessage,
} from '../api';
import { Student, StudentDetails, UserPersona, COHORTS, FACULTIES, CLASS_NUMBERS } from '../types';
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
  AlertCircle,
  GraduationCap,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface StudentManagementProps {
  onNavigateToPath: (studentId: string) => void;
  currentUser?: UserPersona;
  initialSearch?: string;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ 
  onNavigateToPath, 
  currentUser,
  initialSearch = '' 
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoData, setIsDemoData] = useState(false);
  
  // Search state with debounce
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  
  // Class & Cohort & Faculty filters
  const [selectedCohort, setSelectedCohort] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  // Modal states
  const [detailModalStudent, setDetailModalStudent] = useState<StudentDetails | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  // Dynamic Class selector states for Add/Edit Modal
  const [modalCohort, setModalCohort] = useState<string>('K24');
  const [modalFaculty, setModalFaculty] = useState<string>('CNTT');
  const [modalClassNum, setModalClassNum] = useState<string>('01');
  const [customClassName, setCustomClassName] = useState<string>('K24-CNTT01');

  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    class_name: 'K24-CNTT01',
    attendance_rate: '0.85',
    study_hours: '12.0',
    assignment_score: '7.5',
    quiz_score: '7.0',
    completion_rate: '0.80',
    previous_score: '7.0'
  });

  // Debounce search effect (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync initialSearch if prop changes
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Update composite class name in Modal when cohort/faculty/classNum change
  useEffect(() => {
    const combined = `${modalCohort}-${modalFaculty}${modalClassNum}`;
    setCustomClassName(combined);
    setFormData(prev => ({ ...prev, class_name: combined }));
  }, [modalCohort, modalFaculty, modalClassNum]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await fetchStudents({
        search: debouncedSearch.trim(),
        cohort: selectedCohort || undefined,
        faculty: selectedFaculty || undefined,
        risk_level: selectedRisk || undefined,
        sort_by: sortBy,
        page,
        limit: 12
      });
      if (res.success) {
        setIsDemoData(res.data_mode === 'synthetic_demo');
        setStudents(res.students);
        setTotalPages(res.pagination.total_pages);
        setTotalStudents(res.pagination.total);
      }
    } catch (err) {
      console.error('Unable to load students:', getErrorMessage(err, 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [debouncedSearch, selectedCohort, selectedFaculty, selectedRisk, sortBy, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCohort('');
    setSelectedFaculty('');
    setSelectedRisk('');
    setSortBy('newest');
    setPage(1);
  };

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
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi kết nối'));
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalClass = customClassName.trim() || `${modalCohort}-${modalFaculty}${modalClassNum}`;
      const payload = {
        ...formData,
        class_name: finalClass
      };

      if (editingStudent) {
        const res = await updateStudent(editingStudent.student_id, {
          full_name: payload.full_name,
          class_name: payload.class_name
        });
        if (res.success) {
          setEditingStudent(null);
          loadStudents();
        } else {
          alert(res.error || 'Lỗi cập nhật');
        }
      } else {
        const res = await createStudent(payload);
        if (res.success) {
          const addedId = payload.student_id;
          setIsAddModalOpen(false);
          setNewlyAddedId(addedId);
          handleResetFilters();
          setFormData({
            student_id: '',
            full_name: '',
            class_name: 'K24-CNTT01',
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
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi kết nối'));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    // Parse class parts if match e.g. K24-CNTT01
    const match = s.class_name.match(/^(K\d+)-([A-ZĐ]+)(\d+)?/i);
    if (match) {
      setModalCohort(match[1]);
      setModalFaculty(match[2]);
      if (match[3]) setModalClassNum(match[3]);
    }
    setCustomClassName(s.class_name);
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

  const hasActiveFilter = search || selectedCohort || selectedFaculty || selectedRisk || sortBy !== 'newest';

  return (
    <div className="space-y-6">
      {isDemoData && (
        <div
          role="note"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <strong className="font-bold">DEMO — Danh sách giả lập.</strong>
          {' '}Chỉ dùng mã DEMO-* và tên “Sinh viên DEMO ...”; không nhập hồ sơ cá nhân thật.
        </div>
      )}

      {/* Student Role Welcome Banner if logged in as Student */}
      {currentUser?.role === 'student' && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl text-white shadow-inner">
              🎓
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold">Góc nhìn Sinh viên: {currentUser.name}</h3>
                <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-xs font-semibold">
                  {currentUser.studentId}
                </span>
              </div>
              <p className="text-xs text-purple-100 mt-0.5">
                Lớp: <span className="font-bold underline">{currentUser.className}</span> • Bạn có thể theo dõi kết quả của bạn và các bạn cùng khóa/khoa
              </p>
            </div>
          </div>
          {!isDemoData && (
            <button
              onClick={() => onNavigateToPath(currentUser.studentId || 'SV2026')}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Xem lộ trình cá nhân của tôi</span>
            </button>
          )}
        </div>
      )}

      {/* Control Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Enhanced Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã SV, họ tên, tên lớp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center space-x-2">
            {hasActiveFilter && (
              <button
                onClick={handleResetFilters}
                className="flex items-center space-x-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                title="Đặt lại tất cả bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingStudent(null);
                setModalCohort('K24');
                setModalFaculty('CNTT');
                setModalClassNum('01');
                setCustomClassName('K24-CNTT01');
                setFormData({
                  student_id: '',
                  full_name: '',
                  class_name: 'K24-CNTT01',
                  attendance_rate: '0.85',
                  study_hours: '12.0',
                  assignment_score: '7.5',
                  quiz_score: '7.0',
                  completion_rate: '0.80',
                  previous_score: '7.0'
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm sinh viên</span>
            </button>
          </div>
        </div>

        {/* Dynamic Selectors Bar: Khóa, Khoa/Ngành, Rủi ro, Sắp xếp */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Lọc theo:</span>
          </div>

          {/* 1. Lọc Khóa học (K20, K21, K22, K23, K24, K25, K26...) */}
          <select
            value={selectedCohort}
            onChange={(e) => { setSelectedCohort(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả các khóa</option>
            {COHORTS.map(c => (
              <option key={c} value={c}>Khóa {c.replace('K', '')} ({c})</option>
            ))}
          </select>

          {/* 2. Lọc Khoa / Chuyên ngành (CNTT, KTPM, KHMT, TTĐPT, KTĐT...) */}
          <select
            value={selectedFaculty}
            onChange={(e) => { setSelectedFaculty(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả các khoa / ngành</option>
            {FACULTIES.map(f => (
              <option key={f.code} value={f.code}>
                Khoa {f.code} – {f.name}
              </option>
            ))}
          </select>

          {/* 3. Lọc Mức độ rủi ro */}
          <select
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Mọi mức độ rủi ro</option>
            <option value="Cao">Nguy cơ cao</option>
            <option value="Trung bình">Nguy cơ trung bình</option>
            <option value="Thấp">An toàn (Thấp)</option>
          </select>

          {/* 4. Sắp xếp kết quả */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="newest">Sắp xếp: Mới nhất trước</option>
            <option value="id_asc">Sắp xếp: Mã SV (A-Z)</option>
            <option value="name_asc">Sắp xếp: Họ tên (A-Z)</option>
          </select>
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
              Đã thêm sinh viên <strong>{newlyAddedId}</strong> vào danh sách DEMO riêng trên Cloudflare D1.
              {' '}Các chỉ số chỉ để minh họa, không phải dự đoán Machine Learning.
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

      {/* Active Search & Filter Chips Bar */}
      {hasActiveFilter && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Đang lọc theo:</span>
          {search && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
              <span>Từ khóa: "{search}"</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-blue-900" onClick={() => setSearch('')} />
            </span>
          )}
          {selectedCohort && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
              <span>Khóa: {selectedCohort}</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-indigo-900" onClick={() => setSelectedCohort('')} />
            </span>
          )}
          {selectedFaculty && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg">
              <span>Khoa: {selectedFaculty}</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-cyan-900" onClick={() => setSelectedFaculty('')} />
            </span>
          )}
          {selectedRisk && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              <span>Rủi ro: {selectedRisk}</span>
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-900" onClick={() => setSelectedRisk('')} />
            </span>
          )}
          <span className="text-slate-500 font-semibold ml-2">
            ({totalStudents} sinh viên phù hợp)
          </span>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Tìm thấy <strong>{totalStudents}</strong> sinh viên</span>
          <span>Trang {page} / {totalPages || 1}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5">Mã SV</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Lớp học (Khóa - Khoa)</th>
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
                    <span>Đang tải danh sách sinh viên...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy sinh viên nào phù hợp.</p>
                    <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc".</p>
                    {hasActiveFilter && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isNew = s.student_id === newlyAddedId;
                  const isCurrentStudent = currentUser?.studentId === s.student_id;
                  return (
                    <tr 
                      key={s.student_id} 
                      className={`transition-colors ${
                        isNew 
                          ? 'bg-blue-50/80 border-l-4 border-blue-600 font-medium' 
                          : isCurrentStudent
                          ? 'bg-purple-50/70 border-l-4 border-purple-600'
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
                          {isCurrentStudent && (
                            <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[10px] rounded font-semibold uppercase">
                              Bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {s.full_name || 'Chưa cập nhật tên'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium border border-slate-200">
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
                        {!s.is_seed_data && (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              title="Sửa bản ghi DEMO"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.student_id)}
                              title="Xóa bản ghi DEMO"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isDemoData ? (
                          <span title="Lộ trình chưa bật trong DEMO" className="inline-flex p-1.5 text-slate-300">
                            <UserCheck className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => onNavigateToPath(s.student_id)}
                            title="Lộ trình học tập"
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
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
                  detailModalStudent.topic_results.map((tr) => (
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
              {detailModalStudent.data_mode === 'synthetic_demo'
                ? <span className="text-xs text-slate-500">Lộ trình chưa bật trong DEMO.</span>
                : (
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
                )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal with Dynamic Class Builder */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveStudent} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStudent ? 'Cập nhật sinh viên' : 'Thêm sinh viên mới'}
                </h3>
                <p className="text-xs text-slate-500">Nhập thông tin và chọn Khóa / Khoa / Lớp phù hợp</p>
              </div>
              <button 
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingStudent(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isDemoData ? 'Mã sinh viên DEMO-* *' : 'Mã sinh viên *'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStudent}
                    placeholder={isDemoData ? 'VD: DEMO-0061' : 'VD: SV2026_099'}
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isDemoData ? 'Tên sinh viên DEMO *' : 'Họ và tên *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isDemoData ? 'Sinh viên DEMO 061' : 'VD: Nguyễn Văn An'}
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Dynamic Class Selection by Khóa & Khoa */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Lớp học (Chọn Khóa, Khoa / Chuyên ngành, Số lớp) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Khóa */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Khóa học</span>
                    <select
                      value={modalCohort}
                      onChange={(e) => setModalCohort(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {COHORTS.map(c => (
                        <option key={c} value={c}>Khóa {c.replace('K', '')} ({c})</option>
                      ))}
                    </select>
                  </div>

                  {/* Khoa */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Khoa / Ngành</span>
                    <select
                      value={modalFaculty}
                      onChange={(e) => setModalFaculty(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {FACULTIES.map(f => (
                        <option key={f.code} value={f.code}>{f.code} ({f.name})</option>
                      ))}
                    </select>
                  </div>

                  {/* Số lớp */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Số lớp</span>
                    <select
                      value={modalClassNum}
                      onChange={(e) => setModalClassNum(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {CLASS_NUMBERS.map(num => (
                        <option key={num} value={num}>Lớp {num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Resulting Class Name Preview */}
                <div className="flex items-center space-x-2 pt-1 text-xs">
                  <span className="text-slate-500">Tên lớp định dạng:</span>
                  <input
                    type="text"
                    required
                    value={customClassName}
                    onChange={(e) => {
                      setCustomClassName(e.target.value);
                      setFormData(prev => ({ ...prev, class_name: e.target.value }));
                    }}
                    className="flex-1 px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
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
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
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
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
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
export default StudentManagement;
