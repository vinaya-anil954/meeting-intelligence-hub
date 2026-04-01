import React from 'react';

export default function SentimentChart({ sentiment }) {
    if (!sentiment || sentiment.length === 0) {
        return <div className="text-gray-500">No sentiment data available</div>;
    }

    const positive = sentiment.filter(s => s.sentiment_label === 'positive').length;
    const neutral = sentiment.filter(s => s.sentiment_label === 'neutral').length;
    const negative = sentiment.filter(s => s.sentiment_label === 'negative').length;
    const total = sentiment.length;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Sentiment Analysis</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <div className="text-4xl font-bold text-green-500">{positive}</div>
                    <div className="text-gray-600">😊 Positive</div>
                    <div className="text-sm text-gray-400 mt-1">{Math.round((positive/total)*100)}%</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-500">{neutral}</div>
                    <div className="text-gray-600">😐 Neutral</div>
                    <div className="text-sm text-gray-400 mt-1">{Math.round((neutral/total)*100)}%</div>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-bold text-red-500">{negative}</div>
                    <div className="text-gray-600">😠 Negative</div>
                    <div className="text-sm text-gray-400 mt-1">{Math.round((negative/total)*100)}%</div>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{width: `${(positive/total)*100}%`}} />
                <div className="bg-yellow-500 h-full" style={{width: `${(neutral/total)*100}%`}} />
                <div className="bg-red-500 h-full" style={{width: `${(negative/total)*100}%`}} />
            </div>
        </div>
    );
}