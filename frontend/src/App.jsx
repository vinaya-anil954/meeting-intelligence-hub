import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import ChatBot from './components/Chatbot';
import SentimentDashboard from './components/SentimentDashboard';
import { Menu, X, BarChart3, FolderOpen, TrendingUp, MessageCircle, Upload, Download, FileText } from 'lucide-react';

function App() {
  const [tab, setTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectData = async (projectId) => {
    try {
      const transcriptsRes = await axios.get(`${API_URL}/transcripts/project/${projectId}`);
      setTranscripts(transcriptsRes.data);

      let decisions = 0, actions = 0;
      for (const t of transcriptsRes.data) {
        const detailRes = await axios.get(`${API_URL}/transcripts/${t.id}`);
        decisions += detailRes.data.decisions.length;
        actions += detailRes.data.action_items.length;
      }

      setStats({
        transcriptCount: transcriptsRes.data.length,
        decisionCount: decisions,
        actionCount: actions
      });
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      await axios.post(`${API_URL}/projects`, {
        name: projectName,
        description: projectDesc
      });
      setProjectName('');
      setProjectDesc('');
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || !selectedProject) return;

    setLoading(true);
    const formData = new FormData();
    for (let file of files) {
      formData.append('files', file);
    }
    formData.append('projectId', selectedProject.id);

    try {
      await axios.post(`${API_URL}/transcripts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Transcripts uploaded successfully!');
      fetchProjectData(selectedProject.id);
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('❌ Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    if (!selectedProject) return;
    try {
      const response = await axios.get(`${API_URL}/export/csv/${selectedProject.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meeting-export-${new Date().getTime()}.csv`);
      link.click();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const exportPDF = async () => {
    if (!selectedProject) return;
    try {
      const response = await axios.get(`${API_URL}/export/pdf/${selectedProject.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `meeting-export-${new Date().getTime()}.pdf`);
      link.click();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'sentiment', label: 'Sentiment', icon: TrendingUp },
    { id: 'chat', label: 'Chat', icon: MessageCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🎤 Meeting Intelligence Hub
            </h1>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      tab === item.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {menuOpen && (
            <div className="md:hidden mt-4 space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      tab === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && <Dashboard projects={projects} stats={stats} />}

        {/* PROJECTS TAB */}
        {tab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Project */}
              <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <FolderOpen className="text-blue-600" size={24} />
                  New Project
                </h2>
                <form onSubmit={createProject} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      placeholder="Enter project description"
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    Create Project
                  </button>
                </form>
              </div>

              {/* Project List & Upload */}
              <div className="lg:col-span-2 space-y-6">
                {/* Projects List */}
                <div className="bg-white p-8 rounded-xl shadow-lg">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FolderOpen className="text-blue-600" size={24} />
                    Your Projects
                  </h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {projects.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No projects yet. Create one to get started!</p>
                    ) : (
                      projects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProject(project)}
                          className={`w-full text-left p-4 rounded-lg transition-all duration-200 ${
                            selectedProject?.id === project.id
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-500 shadow-md'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="font-semibold text-gray-800">{project.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{project.description || 'No description'}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Upload Transcripts */}
                {selectedProject && (
                  <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <Upload className="text-blue-600" size={24} />
                      Upload Transcripts
                    </h2>
                    <div className="border-3 border-dashed border-blue-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        accept=".txt,.vtt"
                        disabled={loading}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block">
                        <div className="text-5xl mb-3">📁</div>
                        <div className="text-lg font-medium text-gray-700">Drop files here or click to browse</div>
                        <div className="text-sm text-gray-500 mt-2">Supports .txt and .vtt files</div>
                      </label>
                    </div>
                    {loading && (
                      <div className="text-center text-blue-600 mt-4 font-medium">
                        ⏳ Uploading transcripts...
                      </div>
                    )}
                  </div>
                )}

                {/* Transcripts List */}
                {transcripts.length > 0 && (
                  <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <FileText className="text-blue-600" size={24} />
                      Transcripts ({transcripts.length})
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {transcripts.map(t => (
                        <div key={t.id} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow">
                          <div className="font-semibold text-gray-800">{t.title}</div>
                          <div className="text-sm text-gray-600 mt-2">
                            📊 {t.word_count} words • 🗣️ {t.speaker_count} speakers
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={exportCSV}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <Download size={18} />
                        Export CSV
                      </button>
                      <button
                        onClick={exportPDF}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        <Download size={18} />
                        Export PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SENTIMENT TAB */}
        {tab === 'sentiment' && selectedProject && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <TrendingUp className="text-blue-600" size={32} />
              Sentiment Analysis
            </h1>
                        <SentimentDashboard project={selectedProject} API_URL={API_URL} />
          </div>
        )}

        {/* CHAT TAB */}
        {tab === 'chat' && selectedProject && (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <MessageCircle className="text-blue-600" size={32} />
              AI Chat Assistant
            </h1>
            <ChatBot projectId={selectedProject.id} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;