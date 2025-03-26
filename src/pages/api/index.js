// src/pages/index.js
import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setReply(data.reply);
    } catch (err) {
      setReply('エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AIケアマネくん🧠</h1>
      <textarea
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="AIに話しかけてみよう（例：〇〇さんの記録を作成して）"
        style={{ width: '100%', marginBottom: 10 }}
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? '送信中...' : '送信'}
      </button>
      <div style={{ marginTop: 20 }}>
        <strong>AIの返答：</strong>
        <p>{reply}</p>
      </div>
    </div>
  );
}