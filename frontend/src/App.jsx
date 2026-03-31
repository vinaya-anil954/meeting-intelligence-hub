import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_URL}/meetings`);
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!title.trim() || !transcript.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/meetings`, {
        title,
        transcript,
      });
      setTitle('');
      setTranscript('');
      fetchMeetings();
      setSelectedMeeting(response.data.meeting.id);
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMeeting = async (meetingId) => {
    try {
      const response = await axios.get(`${API_URL}/meetings/${meetingId}`);
      setSelectedMeeting(response.data);
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📋 Meeting Intelligence Hub
          </h1>
          <p className="text-gray-600">Extract decisions and action items from your meetings</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Create Meeting Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ New Meeting</h2>
              <form onSubmit={handleCreateMeeting}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Q2 Planning"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Transcript
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your meeting transcript here..."
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Meetings List & Details */}
          <div className="lg:col-span-2">
            {/* Meetings List */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📅 Meetings</h2>
              {meetings.length === 0 ? (
                <p className="text-gray-500">No meetings yet. Create one to get started!</p>
              ) : (
                <div className="space-y-2">
                  {meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => handleSelectMeeting(meeting.id)}
                      className={`w-full text-left p-3 rounded-lg transition duration-200 ${
                        selectedMeeting?.meeting?.id === meeting.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-semibold text-gray-800">{meeting.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(meeting.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Meeting Details */}
            {selectedMeeting && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {selectedMeeting.meeting.title}
                </h2>

                {/* Transcript */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">📝 Transcript</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedMeeting.meeting.transcript}
                  </p>
                </div>

                {/* Decisions */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">✅ Decisions</h3>
                  {selectedMeeting.decisions.length === 0 ? (
                    <p className="text-gray-500">No decisions extracted</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedMeeting.decisions.map((decision) => (
                        <li
                          key={decision.id}
                          className="bg-green-50 border-l-4 border-green-500 p-3 rounded"
                        >
                          {decision.decision}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Action Items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">⚡ Action Items</h3>
                  {selectedMeeting.action_items.length === 0 ? (
                    <p className="text-gray-500">No action items extracted</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedMeeting.action_items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded"
                        >
                          <div className="font-semibold text-gray-800">{item.action}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            👤 <span className="font-semibold">{item.assigned_to}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            📅 Due: {new Date(item.due_date).toLocaleDateString()}
                          </div>
                          <div className="mt-2">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded ${
                                item.completed
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}
                            >
                              {item.completed ? '✓ Completed' : '⏳ Pending'}
                            </span>
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
      </div>
    </div>
  );
}

export default App;