import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function DecisionsTable({ projectId }) {
  const [decisions, setDecisions] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [activeTab, setActiveTab] = useState('decisions');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchDecisions();
      fetchActionItems();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/decisions/project/${projectId}`);
      setDecisions(res.data);
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/action-items/project/${projectId}`);
      setActionItems(res.data);
    } catch (err) {
      console.error('Failed to fetch action items:', err);
    }
  };

  const toggleComplete = async (id, current) => {
    try {
      await axios.patch(`${API_URL}/action-items/${id}`, { completed: !current });
      fetchActionItems();
    } catch (err) {
      console.error('Failed to update action item:', err);
    }
  };

  const deleteDecision = async (id) => {
    try {
      await axios.delete(`${API_URL}/decisions/${id}`);
      fetchDecisions();
    } catch (err) {
      console.error('Failed to delete decision:', err);
    }
  };

  const deleteActionItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/action-items/${id}`);
      fetchActionItems();
    } catch (err) {
      console.error('Failed to delete action item:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('decisions')}
          className={`flex-1 py-3 font-semibold text-sm transition ${
            activeTab === 'decisions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✅ Decisions ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 py-3 font-semibold text-sm transition ${
            activeTab === 'actions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚡ Action Items ({actionItems.length})
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : activeTab === 'decisions' ? (
          decisions.length === 0 ? (
            <p className="text-gray-400 text-sm">No decisions extracted yet. Upload transcripts to analyze.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start justify-between bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3"
                >
                  <div className="flex-1">
                    <p className="text-gray-800 text-sm">{d.decision}</p>
                    <p className="text-xs text-gray-400 mt-1">{d.transcript_title}</p>
                  </div>
                  <button
                    onClick={() => deleteDecision(d.id)}
                    className="text-gray-300 hover:text-red-400 ml-3 text-base"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          actionItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No action items extracted yet. Upload transcripts to analyze.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-semibold">Action</th>
                    <th className="pb-2 font-semibold">Assigned To</th>
                    <th className="pb-2 font-semibold">Due Date</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {actionItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4 max-w-xs">
                        <span className={item.completed ? 'line-through text-gray-400' : 'text-gray-800'}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                        {item.assigned_to || 'TBD'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => toggleComplete(item.id, item.completed)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-full transition ${
                            item.completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          {item.completed ? '✓ Done' : '⏳ Pending'}
                        </button>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-400 truncate max-w-[120px]">
                        {item.transcript_title}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => deleteActionItem(item.id)}
                          className="text-gray-300 hover:text-red-400"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
