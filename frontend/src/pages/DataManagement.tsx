// frontend/src/pages/DataManagement.tsx
import React, { useState, useEffect } from 'react';
import { importData, fetchImportHistory, getErrorMessage } from '../api';
import { ImportHistoryItem, ImportRecord, ImportResult } from '../types';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Database,
  Cloud,
  Check
} from 'lucide-react';

export const DataManagement: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRecord[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchImportHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error('Unable to load import history:', getErrorMessage(err, 'Unknown error'));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setPreviewError('File CSV không có dữ liệu hoặc thiếu dòng tiêu đề.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const expectedHeaders = ['student_id', 'attendance_rate', 'study_hours', 'assignment_score', 'quiz_score', 'completion_rate', 'previous_score'];
        const missing = expectedHeaders.filter(h => !headers.includes(h));

        if (missing.length > 0) {
          setPreviewError(`File CSV thiếu các cột bắt buộc: ${missing.join(', ')}`);
          return;
        }

        const rows: ImportRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= headers.length) {
            const studentIdIndex = headers.indexOf('student_id');
            const rowObj: ImportRecord = {
              student_id: values[studentIdIndex] || '',
            };
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx];
            });
            rows.push(rowObj);
          }
        }

        setParsedRows(rows);
      } catch (err) {
        setPreviewError(`Không thể phân tích định dạng file CSV: ${getErrorMessage(err, 'Dữ liệu không hợp lệ')}`);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDownloadSample = () => {
    const sampleCsv = 
`student_id,full_name,class_name,attendance_rate,study_hours,assignment_score,quiz_score,completion_rate,previous_score,final_score
SV2026_501,Trần Văn An,K19-CNTT01,0.95,16.5,8.5,8.0,0.90,8.2,8.4
SV2026_502,Lê Thị Bình,K19-CNTT01,0.70,8.0,5.5,5.0,0.65,6.0,5.2
SV2026_503,Phạm Đức Cường,K19-CNTT02,0.85,14.0,7.0,7.5,0.80,7.0,7.3
SV2026_504,Hoàng Minh Dũng,K19-CNTT02,0.55,4.0,4.0,3.5,0.45,4.5,3.8
SV2026_505,Vũ Thị Hà,K19-KTPM01,0.90,15.0,8.0,8.5,0.88,8.0,8.2`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_learning_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    if (!file) return;
    setImporting(true);
    try {
      const res = await importData(file);
      if (res.success) {
        setImportResult(res);
        setParsedRows([]);
        setFile(null);
        loadHistory();
      } else {
        alert(res.error || 'Lỗi khi nhập dữ liệu');
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi kết nối'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & Actions Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>Quản lý & Nhập dữ liệu học tập</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tải file CSV lên bucket riêng tư Cloudflare R2. Dữ liệu hiện chưa được nạp vào D1.
            </p>
          </div>

          <button
            onClick={handleDownloadSample}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Tải file mẫu CSV</span>
          </button>
        </div>

        {/* Drag Drop Area */}
        <div className="mt-5">
          <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all">
            <UploadCloud className="w-10 h-10 text-blue-600 mb-2" />
            <span className="text-sm font-bold text-slate-800">Chọn hoặc kéo thả file CSV tại đây</span>
            <span className="text-xs text-slate-400 mt-1">Định dạng hỗ trợ: .csv (Dữ liệu học tập sinh viên)</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {previewError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{previewError}</span>
          </div>
        )}

        {importResult && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu file vào Cloudflare R2</span>
            </div>
            <p>
              Đã lưu <strong>{importResult.filename}</strong> ({(importResult.size / 1024).toFixed(1)} KB).
              Khóa lưu trữ: <code className="bg-emerald-100 px-1 py-0.5 rounded">{importResult.r2_key}</code>.
              File được lưu ở R2; dữ liệu chưa được nạp vào D1.
            </p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Xem trước dữ liệu ({parsedRows.length} bản ghi)</h4>
              <p className="text-xs text-slate-500">File: {file?.name}</p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={importing}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tải file lên R2...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>Tải file lên R2</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 sticky top-0">
                <tr>
                  <th className="p-2.5">student_id</th>
                  <th className="p-2.5">attendance</th>
                  <th className="p-2.5">study_hours</th>
                  <th className="p-2.5">assignment</th>
                  <th className="p-2.5">quiz</th>
                  <th className="p-2.5">completion</th>
                  <th className="p-2.5">previous</th>
                  <th className="p-2.5">final_score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-800">{r.student_id}</td>
                    <td className="p-2.5">{r.attendance_rate}</td>
                    <td className="p-2.5">{r.study_hours}</td>
                    <td className="p-2.5">{r.assignment_score}</td>
                    <td className="p-2.5">{r.quiz_score}</td>
                    <td className="p-2.5">{r.completion_rate}</td>
                    <td className="p-2.5">{r.previous_score}</td>
                    <td className="p-2.5 font-bold">{r.final_score || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 10 && (
            <p className="text-[11px] text-slate-400 text-center">... và {parsedRows.length - 10} bản ghi khác.</p>
          )}
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">Các file đã lưu trên Cloudflare R2</h4>
          <button
            onClick={loadHistory}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Tên file</th>
                <th className="px-5 py-3 text-center">Dung lượng</th>
                <th className="px-5 py-3" colSpan={2}>Trạng thái</th>
                <th className="px-5 py-3">R2 Storage Object Key</th>
                <th className="px-5 py-3 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-400">
                    Chưa có file nào trong bucket R2.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.import_id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-semibold text-slate-800 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{h.filename}</span>
                    </td>
                    <td className="px-5 py-3 text-center font-bold">{(h.size / 1024).toFixed(1)} KB</td>
                    <td className="px-5 py-3 text-slate-500" colSpan={2}>Đã lưu trên R2</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">{h.r2_key || 'r2://default'}</td>
                    <td className="px-5 py-3 text-right text-slate-400">{h.created_at}</td>
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
