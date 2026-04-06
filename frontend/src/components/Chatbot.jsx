import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageCircle, BookOpen } from 'lucide-react';

// FIX: accepts API_URL as prop, no hardcoded localhost
export default function ChatBot({ projectId, projectName, API_URL }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { fetchHistory(); }, [projectId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const r = await axios.get(`${API_URL}/chat/history/${projectId}`);
      setMessages(r.data);
    } catch (e) { console.error(e); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setLoading(true);
    // Optimistically add user message
    const tempId = Date.now();
    setMessages(prev => [...prev, { _temp: true, id: tempId, user_question: question }]);
    try {
      const r = await axios.post(`${API_URL}/chat/ask`, { projectId, question });
      // Replace temp with real response
      setMessages(prev => prev.filter(m => !m._temp).concat([r.data]));
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Something went wrong. Please try again.';
      setMessages(prev => prev.filter(m => !m._temp).concat([{ id: tempId, user_question: question, ai_response: errMsg, source_transcripts: '' }]));
    } finally { setLoading(false); }
  };

  const suggestions = [
    'What decisions were made in this project?',
    'List all action items and who is responsible',
    'What were the main concerns raised?',
    'Summarise the key outcomes',
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, marginBottom: 4 }}>AI Chat Assistant</h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Ask anything about <strong>{projectName}</strong> transcripts</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 560, padding: 0, overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 && !loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MessageCircle size={26} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ask about your meetings</div>
              <p style={{ color: 'var(--ink-muted)', fontSize: 14, maxWidth: 340, marginBottom: 24, lineHeight: 1.6 }}>
                I can answer questions about decisions, action items, specific speakers, and anything else from your uploaded transcripts.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 440 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)}
                    style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'left', transition: 'all 0.15s', lineHeight: 1.4 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-soft)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface-2)'; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FIX: use msg.id as key, not array index */}
          {messages.map(msg => (
            <div key={msg.id} className="animate-fade-up">
              {/* User */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <div className="chat-bubble-user">{msg.user_question}</div>
              </div>
              {/* AI */}
              {(msg.ai_response || msg._temp) && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '85%' }}>
                    <div className="chat-bubble-ai">
                      {msg._temp ? (
                        <span style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>Thinking…</span>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.ai_response}</div>
                      )}
                      {msg.source_transcripts && msg.source_transcripts !== 'N/A' && (
                        <div className="chat-source">
                          <BookOpen size={11} style={{ display: 'inline', marginRight: 4 }} />
                          Sources: {msg.source_transcripts}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="thinking-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-muted)', display: 'inline-block' }} />
                <span className="thinking-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-muted)', display: 'inline-block' }} />
                <span className="thinking-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-muted)', display: 'inline-block' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
          <form onSubmit={send} style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question about your meetings…"
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary" style={{ flexShrink: 0, padding: '10px 16px' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
