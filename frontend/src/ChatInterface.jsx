import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface() {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: 'Hello! I am connected to the FAQ database. What can I help you with today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMsg.text })
            });
            const data = await response.json();
            const replyText = data.output || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
            const agentMsg = { id: Date.now() + 1, sender: 'bot', text: replyText };
            setMessages(prev => [...prev, agentMsg]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot error', text: 'Connection error. Check backend.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="view-section active">
            <h1>HR Assistant Chatbot</h1>
            <p style={{ color: '#666', marginTop: '-10px' }}>Ask me anything from the Company FAQ.</p>
            
            <div className="chat-container">
                <div className="chat-history">
                    {messages.map(msg => (
                        <div key={msg.id} className={`msg ${msg.sender} animate-fade-in-up`}>
                            {msg.sender === 'bot error' && <i className="fas fa-exclamation-circle" style={{marginRight: '5px'}}></i>}
                            {msg.text}
                        </div>
                    ))}
                    {loading && (
                        <div className="msg bot animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 20px' }}>
                            <div className="typing-dot" style={{ animationDelay: '0ms' }} />
                            <div className="typing-dot" style={{ animationDelay: '150ms' }} />
                            <div className="typing-dot" style={{ animationDelay: '300ms' }} />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your question here..."
                    />
                    <button 
                        className="btn" 
                        style={{ width: '100px' }} 
                        onClick={sendMessage}
                        disabled={loading}
                    >
                        Send
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
                @keyframes typing-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background-color: #888;
                    border-radius: 50%;
                    animation: typing-bounce 1s infinite;
                }
            `}</style>
        </div>
    );
}
