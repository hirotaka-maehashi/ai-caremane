import { useState } from 'react';

export default function ChatStyleTest() {
  const [messages, setMessages] = useState([
    { role: 'user', text: 'こんにちは！' },
    { role: 'ai', text: 'こんにちは！AIパートナーです😊' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }, { role: 'ai', text: '（AIからの返信）' }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="p-4 bg-white shadow text-xl font-bold">
        AI Partner チャット
      </header>

      {/* チャット本文エリア */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-lg shadow ${
              msg.role === 'user'
                ? 'bg-blue-100 self-end text-right ml-auto'
                : 'bg-gray-200 self-start'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </main>

      {/* 入力エリア */}
      <footer className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded px-4 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            送信
          </button>
        </div>
      </footer>
    </div>
  );
}
