// frontend/src/pages/MLModelManagement.tsx
import React, { useState, useEffect } from 'react';
import { fetchImportHistory, fetchModelInfo, getErrorMessage } from '../api';
import { ImportHistoryItem, ModelInfo } from '../types';
import { 
  Cpu, 
  Award, 
  CheckCircle2, 
  BarChart2, 
  RefreshCw, 
  Layers, 
  Calendar, 
  Database,
  Sliders,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Line
} from 'recharts';

export const MLModelManagement: React.FC = () => {
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ImportHistoryItem[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const response = await fetchImportHistory();
      if (!response.success) {
        throw new Error('Máy chủ không trả về danh sách CSV.');
      }
      const history = [...response.history].sort((a, b) => {
        const timeA = Date.parse(a.created_at) || 0;
        const timeB = Date.parse(b.created_at) || 0;
        return timeB - timeA;
      });
      setFiles(history);
      setSelectedKey((current) => (
        history.some((file) => (file.r2_key || file.import_id) === current)
          ? current
          : history.length > 0
            ? history[0].r2_key || history[0].import_id
            : ''
      ));
    } catch (err) {
      setFilesError(getErrorMessage(err, 'Không thể tải danh sách CSV trong R2'));
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!selectedKey) {
      setModel(null);
      setError(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    setModel(null);
    try {
      fetchModelInfo(selectedKey)
        .then((res) => {
          if (!active) return;
          if (res.success) setModel(res);
          else setError('Không thể tính metrics cho file CSV đã chọn.');
        })
        .catch((err) => {
          if (active) setError(getErrorMessage(err, 'Không thể đánh giá file CSV đã chọn'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch (err) {
      if (active) {
        setError(getErrorMessage(err, 'Không thể đánh giá file CSV đã chọn'));
        setLoading(false);
      }
    }
    return () => { active = false; };
  }, [selectedKey, reloadToken]);

  const fileSelector = (
    <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[240px] space-y-2">
          <span className="text-xs font-bold uppercase text-slate-600">Bảng CSV nguồn</span>
          <select
            aria-label="Bảng CSV nguồn"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50"
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={filesLoading || files.length === 0}
          >
            {files.length === 0 && <option value="">Chưa có file CSV trong R2</option>}
            {files.map((file) => {
              const key = file.r2_key || file.import_id;
              return (
                <option key={key} value={key}>
                  {file.filename} — {new Date(file.created_at).toLocaleString('vi-VN')}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="button"
          onClick={loadFiles}
          disabled={filesLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
          Làm mới danh sách
        </button>
      </div>
      {selectedKey && (
        <p className="mt-2 text-xs text-slate-500">
          Metrics và biểu đồ bên dưới được tính riêng từ file đang chọn.
        </p>
      )}
    </section>
  );

  if (filesLoading) {
    return (
      <div className="space-y-6">
        {fileSelector}
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Đang tải danh sách CSV từ R2...</p>
        </div>
      </div>
    );
  }

  if (filesError || files.length === 0) {
    return (
      <div className="space-y-6">
        {fileSelector}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto space-y-4">
          <Database className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">
            {filesError ? 'Không tải được danh sách CSV' : 'Chưa có file CSV trong R2'}
          </h3>
          <p role="alert" className="text-xs text-slate-600">
            {filesError || 'Hãy tải CSV lên trong mục Quản lý dữ liệu, sau đó làm mới danh sách.'}
          </p>
          <button
            onClick={loadFiles}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            Kiểm tra lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {fileSelector}
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Đang tính metrics cho file CSV đã chọn...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="space-y-6">
        {fileSelector}
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Không thể đánh giá file CSV</h3>
          <p role="alert" className="text-xs text-slate-600">
            {error || 'Không nhận được kết quả đánh giá từ máy chủ.'}
          </p>
          <button
            onClick={() => setReloadToken((token) => token + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const hasRegression = Boolean(model.regression_metrics);

  // Feature Importance Data for BarChart
  const featureData = Object.entries(model.feature_importances).map(([feat, val]) => {
    const labelMap: Record<string, string> = {
      assignment_score: 'Điểm bài tập (Lab)',
      completion_rate: 'Tiến độ hoàn thành bài',
      quiz_score: 'Điểm kiểm tra (Quiz)',
      previous_score: 'Điểm kỳ trước (GPA)',
      attendance_rate: 'Tỷ lệ chuyên cần',
      study_hours: 'Thời gian tự học'
    };
    return {
      feature: labelMap[feat] || feat,
      importance: Math.round(Number(val) * 1000) / 10
    };
  }).sort((a, b) => b.importance - a.importance);

  const scatterActualPredicted = model.actual_vs_predicted || [];
  const confusionClasses = model.classification_metrics.classes;
  const confusionMatrix = model.classification_metrics.confusion_matrix;
  const classPresentation: Record<string, { label: string; tone: string }> = {
    'Cao': { label: 'Cao (Nguy cơ)', tone: 'text-red-700 bg-red-50' },
    'Trung bình': { label: 'Trung bình', tone: 'text-amber-700 bg-amber-50' },
    'Thấp': { label: 'Thấp (An toàn)', tone: 'text-emerald-700 bg-emerald-50' },
  };

  return (
    <div className="space-y-6">
      {fileSelector}
      {/* Model Metadata Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-slate-900">{model.model_name}</h3>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                {model.model_version}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Thuật toán: {model.algorithm_regression && (
                <>
                  <strong className="text-slate-800">{model.algorithm_regression}</strong> &amp;{' '}
                </>
              )}
              <strong className="text-slate-800">{model.algorithm_classification}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Huấn luyện: {model.trained_at}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>{model.total_training_samples} mẫu dữ liệu</span>
            </span>
          </div>
        </div>

        {model.is_demo && (
          <div role="note" className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            {model.demo_notice}
            {model.dataset_info && (
              <span className="block mt-1">
                Dataset: {model.dataset_info.record_count} dòng mô phỏng; chia tập {model.dataset_info.train_test_split}; seed {model.dataset_info.random_seed}.
              </span>
            )}
          </div>
        )}
        {model.data_mode === 'uploaded_csv' && (
          <div role="note" className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            {model.metrics_notice}
            {model.dataset_info && (
              <span className="block mt-1">
                File: {model.dataset_info.name}; {model.dataset_info.record_count} dòng; tập huấn luyện/kiểm tra {model.dataset_info.train_test_split}; seed {model.dataset_info.random_seed}.
              </span>
            )}
          </div>
        )}

        {/* Core Metrics Grid */}
        <div className={`grid grid-cols-2 gap-3 mt-4 ${hasRegression ? 'sm:grid-cols-4 lg:grid-cols-7' : 'sm:grid-cols-4'}`}>
          {model.regression_metrics && (
            <>
          <div className="p-3 bg-blue-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-blue-700 uppercase">MAE</span>
            <p className="text-lg font-extrabold text-blue-950 mt-0.5">{model.regression_metrics.mae}</p>
            <span className="text-[10px] text-blue-600">Sai số TB</span>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-indigo-700 uppercase">RMSE</span>
            <p className="text-lg font-extrabold text-indigo-950 mt-0.5">{model.regression_metrics.rmse}</p>
            <span className="text-[10px] text-indigo-600">Căn bậc hai MSE</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">R² Score</span>
            <p className="text-lg font-extrabold text-emerald-950 mt-0.5">{model.regression_metrics.r2_score}</p>
            <span className="text-[10px] text-emerald-600">Điểm trên tập kiểm tra</span>
          </div>
            </>
          )}

          <div className="p-3 bg-teal-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-teal-700 uppercase">Accuracy</span>
            <p className="text-lg font-extrabold text-teal-950 mt-0.5">
              {Math.round(model.classification_metrics.accuracy * 1000) / 10}%
            </p>
            <span className="text-[10px] text-teal-600">Độ chính xác</span>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-purple-700 uppercase">Precision</span>
            <p className="text-lg font-extrabold text-purple-950 mt-0.5">
              {model.classification_metrics.macro_precision}
            </p>
            <span className="text-[10px] text-purple-600">Macro Precision</span>
          </div>

          <div className="p-3 bg-pink-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-pink-700 uppercase">Recall</span>
            <p className="text-lg font-extrabold text-pink-950 mt-0.5">
              {model.classification_metrics.macro_recall}
            </p>
            <span className="text-[10px] text-pink-600">Macro Recall</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl text-center">
            <span className="text-[11px] font-bold text-amber-700 uppercase">F1-Score</span>
            <p className="text-lg font-extrabold text-amber-950 mt-0.5">
              {model.classification_metrics.macro_f1}
            </p>
            <span className="text-[10px] text-amber-600">Cân bằng P-R</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Feature Importance & Actual vs Predicted */}
      <div className={`grid grid-cols-1 gap-6 ${hasRegression ? 'lg:grid-cols-2' : ''}`}>
        {/* Feature Importance BarChart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="text-sm font-bold text-slate-800 mb-1">Mức độ ảnh hưởng của các đặc trưng (Feature Importance)</h4>
          <p className="text-xs text-slate-500 mb-4">
            {hasRegression
              ? 'Tỷ trọng tuyệt đối của các hệ số Ridge được huấn luyện từ file CSV đang chọn.'
              : 'Mức độ phân biệt các nhóm risk_level dựa trên đặc trưng của file CSV.'}
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(val) => [`${val}%`, 'Độ quan trọng']} />
                <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {model.regression_metrics && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h4 className="text-sm font-bold text-slate-800 mb-1">So sánh Giá trị Thực tế vs Dự đoán (Actual vs Predicted)</h4>
          <p className="text-xs text-slate-500 mb-4">Kết quả dự đoán trên các dòng được giữ lại để kiểm tra, không dùng khi huấn luyện.</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="actual" name="Điểm thực tế" unit="đ" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="predicted" name="Điểm dự đoán" unit="đ" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Mẫu kiểm thử" data={scatterActualPredicted} fill="#2563eb" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </div>

      {/* Confusion Matrix Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h4 className="text-sm font-bold text-slate-800 mb-1">Ma trận nhầm lẫn (Confusion Matrix)</h4>
        <p className="text-xs text-slate-500 mb-4">Kết quả phân loại trên tập kiểm tra của file CSV đang chọn.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs text-slate-700 max-w-xl mx-auto border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-800 font-bold">
              <tr>
                <th className="p-3 text-left border-r border-slate-200">Thực tế \ Dự đoán</th>
                {confusionClasses.map((className) => {
                  const presentation = classPresentation[className] || { label: className, tone: '' };
                  return <th key={className} className={`p-3 ${presentation.tone}`}>Dự đoán {presentation.label}</th>;
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {confusionClasses.map((className, rowIndex) => {
                const presentation = classPresentation[className] || { label: className, tone: '' };
                return (
                  <tr key={className}>
                    <td className={`p-3 font-bold text-left border-r border-slate-200 ${presentation.tone}`}>
                      Thực tế {presentation.label}
                    </td>
                    {confusionClasses.map((_predictedClass, columnIndex) => (
                      <td
                        key={`${className}-${columnIndex}`}
                        className={rowIndex === columnIndex ? 'p-3 font-extrabold bg-blue-50 text-blue-800' : 'p-3 text-slate-500'}
                      >
                        {confusionMatrix[rowIndex]?.[columnIndex] ?? 0}
                        {rowIndex === columnIndex && <span className="font-medium"> (Đúng)</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
