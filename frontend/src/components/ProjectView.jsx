import { useState, useEffect } from 'react';
import axios from 'axios';
import TranscriptUpload from './TranscriptUpload';
import { Trash2, CheckCircle2, Circle, Download, FileText, Calendar, Users, Hash } from 'lucide-react';

export default function ProjectView({ project, API_URL }) {
  const [transcripts, setTranscripts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { fetchTranscripts(); }, [project.id]);

  const fetchTranscripts = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/transcripts/project/${project.id}`);
      setTranscripts(r.data);
      if (r.data.length > 0 && !selected) loadTranscript(r.data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTranscript = async (t) => {
    setLoadingDetail(true);
    try {
      const r = await axios.get(`${API_URL}/transcripts/${t.id}`);
      setSelected(r.data);
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const deleteTranscript = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this transcript?')) return;
    try {
      await axios.delete(`${API_URL}/transcripts/${id}`);
      const updated = transcripts.filter(t => t.id !== id);
      setTranscripts(updated);
      if (selected?.transcript?.id === id) {
        setSelected(null);
        if (updated.length) loadTranscript(updated[0]);
      }
    } catch (e) { alert('Delete failed'); }
  };

  const toggleAction = async (item) => {
    try {
      await axios.patch(`${API_URL}/action-items/${item.id}`, { completed: !item.completed });
      if (selected) {
        setSelected(prev => ({
          ...prev,
          action_items: prev.action_items.map(a => a.id === item.id ? { ...a, completed: !a.completed } : a)
        }));
      }
    } catch (e) { console.error(e); }
  };

  const deleteAction = async (id) => {
    if (!confirm('Delete this action item?')) return;
    try {
      await axios.delete(`${API_URL}/action-items/${id}`);
      setSelected(prev => ({ ...prev, action_items: prev.action_items.filter(a => a.id !== id) }));
    } catch (e) { alert('Delete failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, marginBottom: 4 }}>{project.name}</h1>
          {project.description && <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>{project.description}</p>}
        </div>
        <span className="badge badge-accent">{transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}</span>
      </div>

      <TranscriptUpload projectId={project.id} API_URL={API_URL} onUploadSuccess={fetchTranscripts} />

      <div style={{ display: 'grid', gridTemplateColumns: transcripts.length ? '260px 1fr' : '1fr', gap: 20, marginTop: 20 }}>
        {/* Transcript list */}
        {transcripts.length > 0 && (
          <div className="card" style={{ padding: 16, alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} style={{ color: 'var(--accent)' }} /> Transcripts
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-muted)', fontSize: 14 }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                {transcripts.map(t => {
                  const isActive = selected?.transcript?.id === t.id;
                  return (
                    <div key={t.id} onClick={() => loadTranscript(t)}
                      style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`, background: isActive ? 'var(--accent-soft)' : 'var(--surface-2)', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</div>
                        <button onClick={(e) => deleteTranscript(t.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 2, flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color='var(--ink-muted)'}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Hash size={10} /> {t.word_count?.toLocaleString()} words
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Users size={10} /> {t.speaker_count} speakers
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Detail panel */}
        {loadingDetail ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Loading transcript…</div>
          </div>
        ) : selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Export bar */}
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={`${API_URL}/export/csv/${selected.transcript.id}`} target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
                <Download size={14} /> Export CSV
              </a>
              <a href={`${API_URL}/export/pdf/${selected.transcript.id}`} target="_blank" rel="noreferrer" className="btn btn-danger btn-sm">
                <Download size={14} /> Export PDF
              </a>
              <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} /> {new Date(selected.transcript.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Decisions */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                </div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17 }}>Decisions</h3>
                <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{selected.decisions.length}</span>
              </div>
              {selected.decisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-muted)', fontSize: 14 }}>
                  No decisions were extracted from this transcript.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selected.decisions.map(d => (
                    <div key={d.id} className="decision-chip animate-slide-in">
                      <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{d.decision}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Items */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17 }}>Action Items</h3>
                <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>{selected.action_items.length}</span>
              </div>
              {selected.action_items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-muted)', fontSize: 14 }}>No action items extracted.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selected.action_items.map(item => (
                    <div key={item.id} className={`action-chip animate-slide-in ${item.completed ? 'done' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', textDecoration: item.completed ? 'line-through' : 'none', lineHeight: 1.5 }}>
                            {item.action}
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                            {item.assigned_to && (
                              <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                👤 {item.assigned_to}
                              </span>
                            )}
                            {item.due_date && (
                              <span style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                📅 {item.due_date}
                              </span>
                            )}
                            {item.completed && <span className="badge badge-green" style={{ fontSize: 11 }}>Done</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => toggleAction(item)} className={`btn btn-sm ${item.completed ? 'btn-secondary' : 'btn-success'}`}>
                            {item.completed ? <><Circle size={13} /> Undo</> : <><CheckCircle2 size={13} /> Done</>}
                          </button>
                          <button onClick={() => deleteAction(item.id)} className="btn btn-danger btn-sm">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : transcripts.length > 0 ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Select a transcript to view details</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
