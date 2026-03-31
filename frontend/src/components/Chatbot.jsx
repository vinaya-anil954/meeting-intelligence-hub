import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function Chatbot({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    if (projectId) {
      axios.get(`${API_URL}/chat/history/${projectId}`)
        .then((res) => {
          const history = res.data.flatMap((item) => [
            { role: 'user', text: item.user_question, time: item.created_at },
            { role: 'assistant', text: item.ai_response, time: item.created_at },
          ]);
          setMessages(history);
        })
        .catch((err) => console.error('Failed to fetch chat history:', err));
    }
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userMsg = { role: 'user', text: question, time: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    const q = question;
    setQuestion('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chat/ask`, { projectId, question: q });
      const assistantMsg = {
        role: 'assistant',
        text: res.data.ai_response,
        time: res.data.created_at,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '❌ Error: ' + (err.response?.data?.error || err.message), time: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return;
    try {
      await axios.delete(`${API_URL}/chat/history/${projectId}`);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 480 }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">🤖 Meeting Chatbot</h2>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-gray-400 hover:text-red-400 transition"
          >
            Clear history
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Ask questions about your meeting transcripts</p>
            <div className="mt-4 space-y-2">
              {['What decisions were made?', 'Who has pending action items?', 'What was the overall mood?'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="block w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2 text-gray-500 text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleAsk} className="flex gap-2 p-3 border-t border-gray-100">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your meetings..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
