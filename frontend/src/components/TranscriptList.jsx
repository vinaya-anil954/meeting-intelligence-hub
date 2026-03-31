import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function TranscriptList({ projectId, onSelectTranscript, selectedId }) {
  const [transcripts, setTranscripts] = useState([]);

  const fetchTranscripts = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await axios.get(`${API_URL}/transcripts/project/${projectId}`);
      setTranscripts(res.data);
    } catch (err) {
      console.error('Failed to fetch transcripts:', err);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTranscripts();
  }, [fetchTranscripts]);

  // Expose refresh to parent via event
  useEffect(() => {
    window.addEventListener('transcripts-updated', fetchTranscripts);
    return () => window.removeEventListener('transcripts-updated', fetchTranscripts);
  }, [fetchTranscripts]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this transcript?')) return;
    try {
      await axios.delete(`${API_URL}/transcripts/${id}`);
      fetchTranscripts();
    } catch (err) {
      console.error('Failed to delete transcript:', err);
    }
  };

  if (transcripts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">📄 Transcripts</h2>
        <p className="text-gray-400 text-sm">No transcripts uploaded yet. Use the uploader above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📄 Transcripts ({transcripts.length})</h2>
      <div className="space-y-2">
        {transcripts.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTranscript(t)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition group ${
              selectedId === t.id
                ? 'bg-blue-50 border-2 border-blue-400'
                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate text-sm">{t.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.file_type?.toUpperCase()} · {t.word_count} words ·{' '}
                {new Date(t.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(t.id, e)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-3 text-lg leading-none"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
