import React from 'react';
import { BarChart3, TrendingUp, CheckSquare, Zap } from 'lucide-react';

export default function Dashboard({ projects, stats }) {
  const statCards = [
    {
      title: 'Total Projects',
      value: projects.length,
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Transcripts',
      value: stats.transcriptCount || 0,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Decisions Made',
      value: stats.decisionCount || 0,
      icon: CheckSquare,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Action Items',
      value: stats.actionCount || 0,
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="text-blue-600" size={40} />
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Overview of your meeting intelligence</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${stat.color} text-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">{stat.title}</p>
                  <p className="text-4xl font-bold mt-3">{stat.value}</p>
                </div>
                <Icon size={32} className="opacity-80" />
              </div>
              <div className="mt-4 h-1 bg-white opacity-30 rounded-full"></div>
            </div>
          );
        })}
      </div>

      {/* Projects Preview */}
      {projects.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 3).map(project => (
              <div
                key={project.id}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-blue-600"
              >
                <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                <p className="text-gray-600 mt-2 line-clamp-2">{project.description || 'No description'}</p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    📅 {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-600 text-lg font-medium">No projects yet</p>
          <p className="text-gray-500 mt-2">Create your first project to get started!</p>
        </div>
      )}
    </div>
  );
}