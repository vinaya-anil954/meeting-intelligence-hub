import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import SentimentDashboard from './components/SentimentDashboard';
import ChatBot from './components/Chatbot';
import { LayoutDashboard, FolderOpen, TrendingUp, MessageCircle, Plus, Trash2, X, Menu } from 'lucide-react';

// Use relative URL (proxied by Vite in dev, same origin in prod)
const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [stats, setStats] = useState({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { if (selectedProject) fetchStats(selectedProject.id); }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const r = await axios.get(`${API_URL}/projects`);
      setProjects(r.data);
      if (r.data.length > 0 && !selectedProject) setSelectedProject(r.data[0]);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async (pid) => {
    try {
      const tr = await axios.get(`${API_URL}/transcripts/project/${pid}`);
      let decisions = 0, actions = 0;
      for (const t of tr.data) {
        const d = await axios.get(`${API_URL}/transcripts/${t.id}`);
        decisions += d.data.decisions.length;
        actions += d.data.action_items.length;
      }
      setStats({ transcriptCount: tr.data.length, decisionCount: decisions, actionCount: actions });
    } catch (e) { console.error(e); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      const r = await axios.post(`${API_URL}/projects`, { name: projectName, description: projectDesc });
      setProjects(prev => [r.data, ...prev]);
      setSelectedProject(r.data);
      setProjectName(''); setProjectDesc('');
      setShowNewProject(false);
      setTab('projects');
    } catch (e) { alert('Failed to create project'); }
    finally { setCreating(false); }
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its data?')) return;
    try {
      await axios.delete(`${API_URL}/projects/${id}`);
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      if (selectedProject?.id === id) setSelectedProject(updated[0] || null);
    } catch (e) { alert('Failed to delete project'); }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects',  label: 'Transcripts', icon: FolderOpen },
    { id: 'sentiment', label: 'Sentiment',   icon: TrendingUp },
    { id: 'chat',      label: 'Chat',        icon: MessageCircle },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden'
      }} className={`${sidebarOpen ? '' : 'hidden md:flex'}`} id="sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎤</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>Meeting</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, lineHeight: 1.1, color: 'var(--accent)' }}>Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 12px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '0.08em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>Navigation</div>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                className={`nav-link ${tab === item.id ? 'active' : ''}`} style={{ width: '100%', marginBottom: 2 }}>
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}

          {/* Projects list */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Projects</div>
              <button onClick={() => setShowNewProject(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', padding: 2, borderRadius: 6 }}>
                <Plus size={15} />
              </button>
            </div>
            {projects.map(p => (
              <div key={p.id} onClick={() => { setSelectedProject(p); setTab('projects'); setSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: selectedProject?.id === p.id ? 'var(--accent-soft)' : 'transparent',
                  color: selectedProject?.id === p.id ? 'var(--accent)' : 'var(--ink-soft)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{p.name}</span>
                <button onClick={(e) => deleteProject(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', padding: 2, borderRadius: 4, display: 'flex', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--ink-muted)'}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {projects.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', padding: '8px 10px' }}>No projects yet</div>
            )}
          </div>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      )}

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 50, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
          </div>
          <nav style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                  className={`nav-link ${tab === item.id ? 'active' : ''}`} style={{ width: '100%', marginBottom: 2 }}>
                  <Icon size={16} />{item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--ink-muted)' }} className="md:hidden">
              <Menu size={20} />
            </button>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16 }}>
              {tab === 'dashboard' ? 'Dashboard' : tab === 'projects' ? (selectedProject?.name || 'Transcripts') : tab === 'sentiment' ? 'Sentiment Analysis' : 'AI Chat'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedProject && (
              <span className="badge badge-accent" style={{ fontSize: 12 }}>{selectedProject.name}</span>
            )}
            <button onClick={() => setShowNewProject(true)} className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}>
              <Plus size={15} /> New Project
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {tab === 'dashboard' && <Dashboard projects={projects} stats={stats} onSelectProject={(p) => { setSelectedProject(p); setTab('projects'); }} onNewProject={() => setShowNewProject(true)} />}
          {tab === 'projects' && (
            selectedProject
              ? <ProjectView key={selectedProject.id} project={selectedProject} API_URL={API_URL} />
              : <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>No project selected</div>
                  <p style={{ color: 'var(--ink-muted)', marginBottom: 20 }}>Create a project to start uploading transcripts</p>
                  <button onClick={() => setShowNewProject(true)} className="btn btn-primary">Create Project</button>
                </div>
          )}
          {tab === 'sentiment' && (
            selectedProject
              ? <SentimentDashboard key={selectedProject.id} project={selectedProject} API_URL={API_URL} />
              : <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <p style={{ color: 'var(--ink-muted)' }}>Select a project first</p>
                </div>
          )}
          {tab === 'chat' && (
            selectedProject
              ? <ChatBot key={selectedProject.id} projectId={selectedProject.id} projectName={selectedProject.name} API_URL={API_URL} />
              : <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                  <p style={{ color: 'var(--ink-muted)' }}>Select a project first</p>
                </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20 }}>New Project</h2>
              <button onClick={() => setShowNewProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={createProject}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Project name *</label>
                <input className="input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Q3 Product Reviews" autoFocus />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea className="input" value={projectDesc} onChange={e => setProjectDesc(e.target.value)} placeholder="What are these meetings about?" rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowNewProject(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating || !projectName.trim()}>
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
