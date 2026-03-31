import { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function FileUpload({ projectId, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.txt') || f.name.endsWith('.vtt')
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).filter(
      (f) => f.name.endsWith('.txt') || f.name.endsWith('.vtt')
    );
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress('Uploading...');

    const formData = new FormData();
    formData.append('projectId', projectId);
    files.forEach((f) => formData.append('files', f));

    try {
      const res = await axios.post(`${API_URL}/transcripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProgress(`✅ Uploaded ${res.data.transcripts.length} transcript(s) successfully!`);
      setFiles([]);
      setTimeout(() => {
        setProgress('');
        onUploaded();
      }, 1500);
    } catch (err) {
      setProgress(`❌ Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📤 Upload Transcripts</h2>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="font-semibold text-gray-700">Drag & drop files here, or click to select</p>
        <p className="text-sm text-gray-400 mt-1">Supports .txt and .vtt files</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.vtt"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-gray-600">{files.length} file(s) selected:</p>
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
              <span className="text-sm text-gray-700 truncate">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-red-400 hover:text-red-600 ml-3 text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </button>
        </div>
      )}

      {progress && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
          progress.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {progress}
        </div>
      )}
    </div>
  );
}
