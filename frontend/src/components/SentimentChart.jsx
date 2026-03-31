import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

const COLORS = { positive: '#22c55e', neutral: '#94a3b8', negative: '#ef4444' };

export default function SentimentChart({ projectId }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ positive: 0, neutral: 0, negative: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) fetchSentiment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchSentiment = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sentiment/project/${projectId}`);
      const rows = res.data;

      const lineData = rows.map((row, i) => ({
        name: `Seg ${i + 1}`,
        score: parseFloat(row.sentiment_score.toFixed(2)),
        label: row.sentiment_label,
      }));

      const counts = { positive: 0, neutral: 0, negative: 0 };
      rows.forEach((r) => {
        counts[r.sentiment_label] = (counts[r.sentiment_label] || 0) + 1;
      });

      setData(lineData);
      setSummary(counts);
    } catch (err) {
      console.error('Failed to fetch sentiment:', err);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Positive', value: summary.positive },
    { name: 'Neutral', value: summary.neutral },
    { name: 'Negative', value: summary.negative },
  ].filter((d) => d.value > 0);

  const total = summary.positive + summary.neutral + summary.negative;
  const avgScore = data.length > 0
    ? (data.reduce((s, d) => s + d.score, 0) / data.length).toFixed(2)
    : 0;
  const overallLabel = avgScore > 0.1 ? 'Positive' : avgScore < -0.1 ? 'Negative' : 'Neutral';
  const labelColor = overallLabel === 'Positive' ? 'text-green-600' : overallLabel === 'Negative' ? 'text-red-600' : 'text-gray-600';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-400 text-sm">Analyzing sentiment...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📊 Sentiment Analysis</h2>
        <p className="text-gray-400 text-sm">No sentiment data available. Upload transcripts to analyze.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Sentiment Analysis</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.positive}</p>
          <p className="text-xs text-gray-500 mt-1">Positive segments</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-500">{summary.neutral}</p>
          <p className="text-xs text-gray-500 mt-1">Neutral segments</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{summary.negative}</p>
          <p className="text-xs text-gray-500 mt-1">Negative segments</p>
        </div>
      </div>

      <div className="mb-2 text-sm text-gray-600">
        Overall tone: <span className={`font-bold ${labelColor}`}>{overallLabel}</span>
        {' '}<span className="text-gray-400">({total} segments analyzed)</span>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Sentiment Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(val) => [val.toFixed(2), 'Score']}
              labelStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase()] || '#94a3b8'} />
                ))}
              </Pie>
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
