import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users } from 'lucide-react';

export default function SentimentDashboard({ project, API_URL }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadTranscripts(); }, [project.id]);
  useEffect(() => { if (selected) loadSentiment(selected); }, [selected]);

  const loadTranscripts = async () => {
    try {
      const r = await axios.get(`${API_URL}/transcripts/project/${project.id}`);
      setTranscripts(r.data);
      if (r.data.length) setSelected(r.data[0].id);
    } catch (e) { console.error(e); }
  };

  const loadSentiment = async (id) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/sentiment/transcript/${id}`);
      setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const pos = data.filter(d => d.sentiment_label === 'positive');
  const neu = data.filter(d => d.sentiment_label === 'neutral');
  const neg = data.filter(d => d.sentiment_label === 'negative');
  const total = data.length || 1;
  const pct = (n) => Math.round((n / total) * 100);

  const speakerMap = {};
  data.forEach(d => {
    if (!speakerMap[d.speaker]) speakerMap[d.speaker] = { pos: 0, neu: 0, neg: 0, total: 0 };
    speakerMap[d.speaker][d.sentiment_label === 'positive' ? 'pos' : d.sentiment_label === 'negative' ? 'neg' : 'neu']++;
    speakerMap[d.speaker].total++;
  });
  const speakers = Object.entries(speakerMap).sort((a,b) => b[1].total - a[1].total).slice(0, 8);

  const overallScore = data.length ? data.reduce((s, d) => s + d.sentiment_score, 0) / data.length : 0;
  const overallLabel = overallScore > 0.15 ? 'Positive' : overallScore < -0.15 ? 'Negative' : 'Neutral';
  const overallEmoji = overallScore > 0.15 ? '😊' : overallScore < -0.15 ? '😟' : '😐';
  const overallColor = overallScore > 0.15 ? 'var(--green)' : overallScore < -0.15 ? 'var(--red)' : 'var(--ink-muted)';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, marginBottom: 4 }}>Sentiment Analysis</h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Understand the tone and mood across your meetings</p>
      </div>

      {transcripts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No transcripts yet</div>
          <p style={{ color: 'var(--ink-muted)' }}>Upload transcripts to see sentiment analysis</p>
        </div>
      ) : (
        <>
          {/* Transcript selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {transcripts.map(t => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={`btn btn-sm ${selected === t.id ? 'btn-primary' : 'btn-secondary'}`}>
                {t.title}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--ink-muted)' }}>Analysing sentiment…</div>
          ) : data.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--ink-muted)' }}>No data available for this transcript</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Overall */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{overallEmoji}</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: overallColor }}>{overallLabel}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>Overall Sentiment</div>
                </div>
                <div className="card">
                  <div style={{ marginBottom: 14, fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Positive', count: pos.length, pct: pct(pos.length), color: 'var(--green)', bg: 'var(--green-soft)' },
                      { label: 'Neutral',  count: neu.length, pct: pct(neu.length), color: '#64748b', bg: '#f1f5f9' },
                      { label: 'Negative', count: neg.length, pct: pct(neg.length), color: 'var(--red)',   bg: 'var(--red-soft)' },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: item.color, fontWeight: 500 }}>{item.label}</span>
                          <span style={{ color: 'var(--ink-muted)' }}>{item.count} lines ({item.pct}%)</span>
                        </div>
                        <div className="sentiment-bar">
                          <div style={{ width: `${item.pct}%`, background: item.color, borderRadius: 99, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div style={{ marginBottom: 14, fontFamily: 'Syne', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={16} style={{ color: 'var(--accent)' }} /> Score
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 40, color: overallColor }}>{(overallScore * 100).toFixed(0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>out of 100</div>
                    <div style={{ marginTop: 12, height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(0, (overallScore + 1) / 2 * 100)}%`, height: '100%', background: overallColor, borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                      <span>Negative</span><span>Positive</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per speaker */}
              {speakers.length > 1 && (
                <div className="card">
                  <div style={{ marginBottom: 16, fontFamily: 'Syne', fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} style={{ color: 'var(--accent)' }} /> Speaker Breakdown
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {speakers.map(([speaker, s]) => (
                      <div key={speaker} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{speaker}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className="badge badge-green" style={{ fontSize: 11 }}>+{s.pos}</span>
                            <span className="badge badge-gray" style={{ fontSize: 11 }}>{s.neu}</span>
                            <span className="badge badge-red" style={{ fontSize: 11 }}>-{s.neg}</span>
                          </div>
                        </div>
                        <div className="sentiment-bar" style={{ height: 6 }}>
                          <div style={{ width: `${pct(s.pos)}%`, background: 'var(--green)', borderRadius: 99 }} />
                          <div style={{ width: `${pct(s.neu)}%`, background: '#94a3b8' }} />
                          <div style={{ width: `${pct(s.neg)}%`, background: 'var(--red)', borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line-by-line */}
              <div className="card">
                <div style={{ marginBottom: 16, fontFamily: 'Syne', fontWeight: 700, fontSize: 17 }}>Line-by-line Analysis</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                  {data.slice(0, 50).map(line => (
                    <div key={line.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderRadius: 8, background: line.sentiment_label === 'positive' ? 'var(--green-soft)' : line.sentiment_label === 'negative' ? 'var(--red-soft)' : 'var(--surface-2)', fontSize: 13 }}>
                      <span style={{ flexShrink: 0, fontSize: 16 }}>{line.sentiment_label === 'positive' ? '😊' : line.sentiment_label === 'negative' ? '😟' : '😐'}</span>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>{line.speaker}: </span>
                        <span style={{ color: 'var(--ink)' }}>{line.text.replace(/^[^:]+:\s*/, '').slice(0, 120)}{line.text.length > 120 ? '…' : ''}</span>
                      </div>
                    </div>
                  ))}
                  {data.length > 50 && (
                    <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)', padding: 8 }}>Showing first 50 of {data.length} lines</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
