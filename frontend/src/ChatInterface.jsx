import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I'm the Zuno, an AI assistant that's connected to your company's knowledge base. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const reply = data.output || data.text || data.error || (typeof data === 'string' ? data : JSON.stringify(data));
      const sender = data.error ? 'error' : 'bot';
      setMessages(prev => [...prev, { id: Date.now() + 1, sender, text: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'error', text: 'Connection error — check that the backend is running.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-wrap">
      {/* Header */}
      <div className="chat-header">
        <img src="/images/ZUNO_red.png" alt="ZUNO AI" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
        <div className="chat-header-info">
          <h4>ZUNO AI Assistant</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600 }}>● Online · FAQ Knowledge Base</p>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--grey)' }}>
          Powered by n8n workflows
        </div>
      </div>

      {/* Messages */}
      <div className="chat-history">
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
            {msg.sender !== 'user' && (
              <img src="/images/ZUNO_red.png" alt="ZUNO" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0, marginBottom: 2 }} />
            )}
            <div className={`msg ${msg.sender === 'user' ? 'user' : msg.sender === 'error' ? 'error' : 'bot'}`}>
              {msg.sender !== 'user' && (
                <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: 4, color: msg.sender === 'error' ? '#DC2626' : 'var(--red)' }}>
                  {msg.sender === 'error' ? '⚠ Error' : 'ZUNO AI'}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <img src="/images/ZUNO_red.png" alt="ZUNO" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0, marginBottom: 2 }} />
            <div className="msg bot typing-indicator">
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--red)', marginBottom: 4, width: '100%' }}>ZUNO AI · Analyzing…</div>
              <div className="typing-dot" style={{ animationDelay: '0ms', background: 'var(--red)' }} />
              <div className="typing-dot" style={{ animationDelay: '200ms', background: 'var(--red)' }} />
              <div className="typing-dot" style={{ animationDelay: '400ms', background: 'var(--red)' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the ZUNO AI anything…"
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? '…' : '↑ Send'}
        </button>
      </div>
    </div>
  );
}
