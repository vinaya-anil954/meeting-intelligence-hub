import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ChatBot({ projectId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchChatHistory();
    }, [projectId]);

    const fetchChatHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/chat/history/${projectId}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/chat/ask`, { projectId, question: input });
            setMessages([...messages, response.data]);
            setInput('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-96 bg-white rounded-lg shadow-lg">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        💬 No messages yet. Ask a question about your meetings!
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-end">
                                <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                                    {msg.user_question}
                                </div>
                            </div>
                            <div className="flex justify-start">
                                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-xs">
                                    {msg.ai_response}
                                    <div className="text-xs text-gray-600 mt-2">
                                        📚 {msg.source_transcripts}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {loading && <div className="text-center text-gray-500">⏳ Thinking...</div>}
            </div>
            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={loading} />
                <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
                    📤
                </button>
            </form>
        </div>
    );
}