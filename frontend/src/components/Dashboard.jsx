import { LayoutDashboard, FileText, CheckCircle, Zap, Plus, ArrowRight } from 'lucide-react';

export default function Dashboard({ projects, stats, onSelectProject, onNewProject }) {
  const cards = [
    { label: 'Projects', value: projects.length, icon: '📁', color: '#6c63ff', bg: '#eeeeff' },
    { label: 'Transcripts', value: stats.transcriptCount || 0, icon: '📄', color: '#0891b2', bg: '#ecfeff' },
    { label: 'Decisions', value: stats.decisionCount || 0, icon: '✅', color: '#16a34a', bg: '#dcfce7' },
    { label: 'Action Items', value: stats.actionCount || 0, icon: '⚡', color: '#d97706', bg: '#fef3c7' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', borderRadius: 99, padding: '4px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>MEETING INTELLIGENCE HUB</span>
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36, lineHeight: 1.1, marginBottom: 8 }}>
          Stop re-reading.<br />
          <span style={{ color: 'var(--accent)' }}>Start executing.</span>
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 15, maxWidth: 480 }}>
          Upload meeting transcripts and let AI extract decisions, action items, and answer your questions instantly.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((c, i) => (
          <div key={i} className={`stat-card animate-fade-up stagger-${i+1}`}>
            <div className="stat-icon" style={{ background: c.bg }}>
              <span style={{ fontSize: 20 }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="card animate-fade-up" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>Your Projects</h2>
          <button onClick={onNewProject} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Project
          </button>
        </div>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No projects yet</div>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 20 }}>Create a project to start uploading and analysing meeting transcripts</p>
            <button onClick={onNewProject} className="btn btn-primary">Create your first project</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => onSelectProject(p)}
                style={{ padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s', background: 'var(--surface-2)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface-2)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                  <ArrowRight size={16} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 8 }}>{p.description || 'No description'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card animate-fade-up">
        <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          {[
            { step: '01', icon: '📤', title: 'Upload transcripts', desc: 'Drag & drop .txt or .vtt files from your meetings' },
            { step: '02', icon: '🤖', title: 'AI extracts insights', desc: 'Decisions and action items are automatically identified' },
            { step: '03', icon: '💬', title: 'Ask questions', desc: 'Chat with your transcripts to find any information instantly' },
            { step: '04', icon: '📊', title: 'Analyse sentiment', desc: 'See the tone and mood of each meeting at a glance' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', marginBottom: 8 }}>{item.step}</div>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
