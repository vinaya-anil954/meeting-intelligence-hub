import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SentimentDashboard({ project, API_URL }) {
  const [sentimentData, setSentimentData] = useState([]);
  const [overallSentiment, setOverallSentiment] = useState('neutral');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    analyzeSentiment();
  }, [project]);

  const analyzeSentiment = async () => {
    setLoading(true);
    try {
      const transcriptsRes = await axios.get(`${API_URL}/transcripts/project/${project.id}`);
      const transcripts = transcriptsRes.data;

      let allSentiment = [];
      for (const transcript of transcripts) {
        const sentimentRes = await axios.get(`${API_URL}/sentiment/transcript/${transcript.id}`);
        allSentiment = [...allSentiment, ...sentimentRes.data];
      }

      setSentimentData(allSentiment);

      const avgScore = allSentiment.length > 0 ? allSentiment.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / allSentiment.length : 0;
      
      if (avgScore > 0.3) setOverallSentiment('positive');
      else if (avgScore < -0.3) setOverallSentiment('negative');
      else setOverallSentiment('neutral');
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sentimentCounts = {
    positive: sentimentData.filter(s => s.sentiment_label === 'positive').length,
    neutral: sentimentData.filter(s => s.sentiment_label === 'neutral').length,
    negative: sentimentData.filter(s => s.sentiment_label === 'negative').length
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-lg shadow-lg p-6 text-center text-white ${
        overallSentiment === 'positive' ? 'bg-green-600' :
        overallSentiment === 'negative' ? 'bg-red-600' :
        'bg-gray-600'
      }`}>
        <div className="text-5xl mb-2">{overallSentiment === 'positive' ? '😊' : overallSentiment === 'negative' ? '😞' : '😐'}</div>
        <div className="text-2xl font-bold capitalize">{overallSentiment} Sentiment</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{sentimentCounts.positive}</div>
          <p className="text-gray-600 mt-2">Positive</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-600">{sentimentCounts.neutral}</div>
          <p className="text-gray-600 mt-2">Neutral</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{sentimentCounts.negative}</div>
          <p className="text-gray-600 mt-2">Negative</p>
        </div>
      </div>
    </div>
  );
}