import { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';

export default function TranscriptUpload({ projectId, API_URL, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef();

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.name.endsWith('.txt') || f.name.endsWith('.vtt'));
    const invalid = Array.from(incoming).filter(f => !f.name.endsWith('.txt') && !f.name.endsWith('.vtt'));
    if (invalid.length) alert(`Skipped ${invalid.length} unsupported file(s). Only .txt and .vtt are allowed.`);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !existing.has(f.name))];
    });
    setDone(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true); setProgress(0); setDone(false);
    const formData = new FormData();
    formData.append('projectId', projectId);
    files.forEach(f => formData.append('files', f));
    try {
      await axios.post(`${API_URL}/transcripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      setDone(true); setFiles([]);
      onUploadSuccess();
    } catch (e) {
      alert('Upload failed: ' + (e.response?.data?.error || e.message));
    } finally { setUploading(false); }
  };

  return (
    <div className="card">
      <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Upload Transcripts</h3>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{ marginBottom: 16 }}
      >
        <input ref={inputRef} type="file" multiple accept=".txt,.vtt" style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <Upload size={32} style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Drop files here or click to browse</div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Supports .txt and .vtt transcript files</div>
      </div>

      {done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--green-soft)', borderRadius: 10, marginBottom: 16, color: 'var(--green)' }}>
          <CheckCircle size={18} /> <span style={{ fontWeight: 500, fontSize: 14 }}>Transcripts uploaded and processed successfully!</span>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', flexShrink: 0 }}>{(f.size / 1024).toFixed(1)} KB</span>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', display: 'flex', flexShrink: 0 }}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-muted)', marginBottom: 6 }}>
                <span>Uploading & processing…</span><span>{progress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {uploading ? `Processing… (${progress}%)` : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
