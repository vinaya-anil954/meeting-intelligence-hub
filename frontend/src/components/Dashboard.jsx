import React from 'react';

export default function Dashboard({ projects, stats }) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">📊 Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium opacity-90">Total Projects</h3>
          <p className="text-3xl font-bold mt-2">{projects.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium opacity-90">Total Transcripts</h3>
          <p className="text-3xl font-bold mt-2">{stats.transcriptCount || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium opacity-90">Decisions Made</h3>
          <p className="text-3xl font-bold mt-2">{stats.decisionCount || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <h3 className="text-sm font-medium opacity-90">Action Items</h3>
          <p className="text-3xl font-bold mt-2">{stats.actionCount || 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
            <p className="text-gray-600 mt-1">{project.description}</p>
            <div className="mt-4 text-sm text-gray-500">
              Created: {new Date(project.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}