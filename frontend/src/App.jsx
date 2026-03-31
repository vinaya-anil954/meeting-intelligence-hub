import { useState } from 'react';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import TranscriptList from './components/TranscriptList';
import DecisionsTable from './components/DecisionsTable';
import SentimentChart from './components/SentimentChart';
import Chatbot from './components/Chatbot';
import ExportButtons from './components/ExportButtons';
import './App.css';

function App() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedTranscript(null);
    setActiveTab('overview');
  };

  const handleBack = () => {
    setSelectedProject(null);
    setSelectedTranscript(null);
  };

  const handleUploaded = () => {
    window.dispatchEvent(new Event('transcripts-updated'));
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Dashboard onSelectProject={handleSelectProject} />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'decisions', label: '✅ Decisions & Actions' },
    { id: 'sentiment', label: '📊 Sentiment' },
    { id: 'chatbot', label: '🤖 Chatbot' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-800 font-semibold text-sm transition"
          >
            ← Projects
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-800 text-lg">{selectedProject.name}</h1>
          <div className="flex-1" />
          <ExportButtons
            transcriptId={selectedTranscript?.id}
            transcriptTitle={selectedTranscript?.title}
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <FileUpload projectId={selectedProject.id} onUploaded={handleUploaded} />
              <TranscriptList
                projectId={selectedProject.id}
                onSelectTranscript={setSelectedTranscript}
                selectedId={selectedTranscript?.id}
              />
            </div>
            <div className="lg:col-span-2">
              {selectedTranscript ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{selectedTranscript.title}</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        {selectedTranscript.file_type?.toUpperCase()} · {selectedTranscript.word_count} words ·{' '}
                        {new Date(selectedTranscript.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ExportButtons
                      transcriptId={selectedTranscript.id}
                      transcriptTitle={selectedTranscript.title}
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedTranscript.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
                  <div className="text-5xl mb-4">📄</div>
                  <p className="text-lg font-semibold">Select a transcript to view it</p>
                  <p className="text-sm mt-2">Or upload new transcripts using the panel on the left</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <DecisionsTable projectId={selectedProject.id} />
        )}

        {activeTab === 'sentiment' && (
          <SentimentChart projectId={selectedProject.id} />
        )}

        {activeTab === 'chatbot' && (
          <div className="max-w-3xl mx-auto">
            <Chatbot projectId={selectedProject.id} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;