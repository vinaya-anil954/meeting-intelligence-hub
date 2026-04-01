import { useState, useEffect } from 'react';
import axios from 'axios';
import TranscriptUpload from './TranscriptUpload';

export default function ProjectView({ project, API_URL }) {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  useEffect(() => {
    fetchTranscripts();
  }, [project]);

  const fetchTranscripts = async () => {
    try {
      const response = await axios.get(`${API_URL}/transcripts/project/${project.id}`);
      setTranscripts(response.data);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
    }
  };

  const handleSelectTranscript = async (transcript) => {
    try {
      const response = await axios.get(`${API_URL}/transcripts/${transcript.id}`);
      setSelectedTranscript(response.data);
    } catch (error) {
      console.error('Error fetching transcript details:', error);
    }
  };

  const handleDeleteTranscript = async (transcriptId) => {
    if (!window.confirm('Delete this transcript?')) return;
    try {
      await axios.delete(`${API_URL}/transcripts/${transcriptId}`);
      setTranscripts(transcripts.filter(t => t.id !== transcriptId));
      setSelectedTranscript(null);
    } catch (error) {
      console.error('Error deleting transcript:', error);
    }
  };

  const handleToggleActionItem = async (itemId, currentStatus) => {
    try {
      await axios.patch(`${API_URL}/action-items/${itemId}`, { completed: !currentStatus });
      if (selectedTranscript) await handleSelectTranscript(selectedTranscript.transcript);
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  const handleDeleteActionItem = async (itemId) => {
    if (!window.confirm('Delete this action item?')) return;
    try {
      await axios.delete(`${API_URL}/action-items/${itemId}`);
      if (selectedTranscript) await handleSelectTranscript(selectedTranscript.transcript);
    } catch (error) {
      console.error('Error deleting action item:', error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">📁 {project.name}</h2>
      <TranscriptUpload projectId={project.id} API_URL={API_URL} onUploadSuccess={fetchTranscripts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📄 Transcripts</h3>
            {transcripts.length === 0 ? (
              <p className="text-gray-500">No transcripts uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {transcripts.map((transcript) => (
                  <div key={transcript.id} onClick={() => handleSelectTranscript(transcript)} className={`p-3 rounded-lg cursor-pointer transition ${selectedTranscript?.transcript?.id === transcript.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <div className="font-semibold text-gray-800 truncate">{transcript.title}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTranscript(transcript.id); }} className="text-red-600 hover:text-red-800 mt-1">🗑️ Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTranscript && (
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2">
              <button onClick={() => window.open(`${API_URL}/export/csv/${selectedTranscript.transcript.id}`, '_blank')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition">
                📥 Export CSV
              </button>
              <button onClick={() => window.open(`${API_URL}/export/pdf/${selectedTranscript.transcript.id}`, '_blank')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition">
                📥 Export PDF
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">✅ Decisions</h3>
              {selectedTranscript.decisions.length === 0 ? (
                <p className="text-gray-500">No decisions extracted</p>
              ) : (
                <ul className="space-y-2">
                  {selectedTranscript.decisions.map((decision) => (
                    <li key={decision.id} className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                      {decision.decision}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">⚡ Action Items</h3>
              {selectedTranscript.action_items.length === 0 ? (
                <p className="text-gray-500">No action items extracted</p>
              ) : (
                <div className="space-y-3">
                  {selectedTranscript.action_items.map((item) => (
                    <div key={item.id} className={`border-l-4 p-3 rounded ${item.completed ? 'bg-gray-50 border-gray-500 line-through text-gray-500' : 'bg-yellow-50 border-yellow-500'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`font-semibold ${item.completed ? 'text-gray-500' : 'text-gray-800'}`}>{item.action}</div>
                          <div className="text-sm text-gray-600 mt-1">👤 {item.assigned_to}</div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button onClick={() => handleToggleActionItem(item.id, item.completed)} className={`${item.completed ? 'bg-gray-300 hover:bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white font-bold py-1 px-2 rounded text-sm transition`}>
                            {item.completed ? '↩️' : '✓'}
                          </button>
                          <button onClick={() => handleDeleteActionItem(item.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-sm transition">
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}