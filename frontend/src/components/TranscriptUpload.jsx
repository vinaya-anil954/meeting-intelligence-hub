import { useState } from 'react';
import axios from 'axios';

export default function TranscriptUpload({ projectId, API_URL, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      files.forEach((file) => {
        formData.append('files', file);
      });

      await axios.post(`${API_URL}/transcripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
        }
      });

      alert('Transcripts uploaded successfully!');
      setFiles([]);
      setUploadProgress(0);
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload transcripts');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">📤 Upload Transcripts</h3>
      <div onDragOver={handleDragOver} onDrop={handleDrop} className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 cursor-pointer hover:border-blue-500 transition">
        <div className="text-4xl mb-2">📁</div>
        <p className="text-gray-700 font-semibold mb-2">Drag and drop files here</p>
        <p className="text-gray-600 mb-4">or</p>
        <label className="inline-block">
          <input type="file" multiple accept=".txt,.vtt" onChange={handleFileChange} className="hidden" />
          <span className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded cursor-pointer transition inline-block">Browse Files</span>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold text-gray-800 mb-2">Selected files ({files.length}):</p>
          <ul className="space-y-1 mb-4">
            {files.map((file, idx) => (
              <li key={idx} className="text-gray-600">✓ {file.name}</li>
            ))}
          </ul>

          {uploading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-lg h-2">
                <div className="bg-blue-600 h-2 rounded-lg transition-all" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{uploadProgress}% uploaded</p>
            </div>
          )}

          <button onClick={handleUpload} disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Transcripts'}
          </button>
        </div>
      )}
    </div>
  );
}