import { useState, useEffect } from 'react';
import axios from 'axios';
import TranscriptUpload from './TranscriptUpload';
import { Trash2, CheckCircle2, Circle, Download, FileText } from 'lucide-react';

export default function ProjectView({ project, API_URL }) {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTranscripts();
  }, [project]);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/transcripts/project/${project.id}`);
      setTranscripts(response.data);
    } catch (error) {
      console.error('Error fetching transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTranscript = async (transcript) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/transcripts/${transcript.id}`); 
      setSelectedTranscript(response.data);
    } catch (error) {
      console.error('Error fetching transcript details:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="text-blue-600" size={36} />
          {project.name}
        </h2>
        <div className="text-sm text-gray-600">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
            {transcripts.length} Transcripts
          </span>
        </div>
      </div>

      <TranscriptUpload projectId={project.id} API_URL={API_URL} onUploadSuccess={fetchTranscripts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={24} className="text-blue-600" />
              Transcripts
            </h3>
            {loading && transcripts.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : transcripts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 font-medium">No transcripts yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transcripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    onClick={() => handleSelectTranscript(transcript)}
                    className={`p-4 rounded-lg cursor-pointer transition-all transform hover:scale-105 ${
                      selectedTranscript?.transcript?.id === transcript.id
                        ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold truncate">{transcript.title}</div>
                    <div className={`text-xs mt-1 ${selectedTranscript?.transcript?.id === transcript.id ? 'text-blue-100' : 'text-gray-600'}`}>
                      📅 {new Date(transcript.created_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTranscript(transcript.id);
                      }}
                      className={`text-xs mt-2 flex items-center gap-1 transition ${
                        selectedTranscript?.transcript?.id === transcript.id
                          ? 'text-blue-100 hover:text-white'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTranscript && (
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`${API_URL}/export/csv/${selectedTranscript.transcript.id}`, '_blank')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={() => window.open(`${API_URL}/export/pdf/${selectedTranscript.transcript.id}`, '_blank')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Download size={20} />
                Export PDF
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-green-600">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" size={28} />
                Decisions ({selectedTranscript.decisions.length})
              </h3>
              {selectedTranscript.decisions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="font-medium">No decisions extracted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTranscript.decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 p-5 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="flex gap-3">
                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={24} />
                        <p className="text-gray-800 text-base font-medium">{decision.decision}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-orange-600">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                ⚡ Action Items ({selectedTranscript.action_items.length})
              </h3>
              {selectedTranscript.action_items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="font-medium">No action items extracted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTranscript.action_items.map((item) => (
                    <div
                      key={item.id}
                      className={`border-l-4 p-5 rounded-lg transition-all ${
                        item.completed
                          ? 'bg-gray-100 border-gray-400 opacity-75'
                          : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-500 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className={`font-semibold text-lg ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.action}
                          </div>
                          <div className={`text-sm mt-2 flex items-center gap-2 ${item.completed ? 'text-gray-500' : 'text-gray-700'}`}>
                            👤 <span className="font-medium">{item.assigned_to}</span>
                          </div>
                          {item.due_date && (
                            <div className={`text-sm mt-1 ${item.completed ? 'text-gray-500' : 'text-gray-600'}`}>
                              📅 Due: {new Date(item.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleActionItem(item.id, item.completed)}
                            className={`flex items-center gap-1 font-bold py-2 px-4 rounded-lg transition-all ${
                              item.completed
                                ? 'bg-gray-400 hover:bg-gray-500 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {item.completed ? (
                              <>
                                <Circle size={18} /> Undo
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={18} /> Done
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteActionItem(item.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Trash2 size={18} />
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
