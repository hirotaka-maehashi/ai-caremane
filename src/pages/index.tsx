import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('介護');
  const [companyName, setCompanyName] = useState('');
  const [historyGroups, setHistoryGroups] = useState<{ topic: string; history: { user: string; ai: string }[] }[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const isComposing = useRef(false);

  const industryPlaceholders: Record<string, string> = {
    '介護': 'AIに話しかけてみよう（例：〇〇さんの記録を作成して）',
    '福祉': 'AIに話しかけてみよう（例：支援計画を作成して）',
    '営業': 'AIに話しかけてみよう（例：商談記録を作成して）',
    '医療': 'AIに話しかけてみよう（例：問診内容をまとめて）',
    '教育': 'AIに話しかけてみよう（例：生徒の学習記録を作成して）',
    'カスタマーサポート': 'AIに話しかけてみよう（例：お客様対応の記録を作成して）',
  };

  // 履歴読み込み
  useEffect(() => {
    const saved = localStorage.getItem('chat-history');
    if (saved) {
      setHistoryGroups(JSON.parse(saved));
    }
  }, []);

  // 履歴保存
  useEffect(() => {
    localStorage.setItem('chat-history', JSON.stringify(historyGroups));
  }, [historyGroups]);

  useEffect(() => {
    setInput('');
  }, [industry]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, industry }),
      });
      const data = await res.json();
      setReply(data.reply);

      setHistoryGroups((prev) => {
        if (selectedTopicIndex === null) {
          const newGroup = { topic: input, history: [{ user: input, ai: data.reply }] };
          const newGroups = [...prev, newGroup];
          setSelectedTopicIndex(newGroups.length - 1);
          return newGroups;
        } else {
          return prev.map((group, index) =>
            index === selectedTopicIndex
              ? { ...group, history: [...group.history, { user: input, ai: data.reply }] }
              : group
          );
        }
      });

      setInput('');
    } catch (err) {
      setReply('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleNewTopic = () => {
    const newGroup = { topic: '新しいトピック', history: [] };
    const updatedGroups = [...historyGroups, newGroup];
    setHistoryGroups(updatedGroups);
    setSelectedTopicIndex(updatedGroups.length - 1);
    setInput('');
  };

  const handleRenameTopic = (index: number, newTitle: string) => {
    const updated = [...historyGroups];
    updated[index].topic = newTitle;
    setHistoryGroups(updated);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* サイドバー */}
      <div style={{ width: 250, backgroundColor: '#f4f4f4', padding: 10 }}>
        <h3>🧠 トピック一覧</h3>
        <button onClick={handleNewTopic}>＋ 新しいトピック</button>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {historyGroups.map((group, index) => (
            <li key={index} style={{ margin: '10px 0' }}>
              <div
                onClick={() => setSelectedTopicIndex(index)}
                style={{ cursor: 'pointer', fontWeight: selectedTopicIndex === index ? 'bold' : 'normal' }}
              >
                🗂️ {group.topic}
              </div>
              {selectedTopicIndex === index && (
                <input
                  type="text"
                  value={group.topic}
                  onChange={(e) => handleRenameTopic(index, e.target.value)}
                  style={{ width: '90%' }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* メインエリア */}
      <div style={{ flex: 1, padding: 20 }}>
        <p style={{ fontStyle: 'italic', marginBottom: 10, fontSize: '1.2em' }}>
          {companyName && <span style={{ fontWeight: 'bold' }}>{companyName}</span>} with AI Partner<br />
          <span style={{ fontWeight: 'bold' }}>Powered by ChatGPT</span>
        </p>

        <div style={{ marginBottom: 10 }}>
          <label>企業名：</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="例：株式会社〇〇"
            style={{ marginLeft: 10, width: '50%' }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>業種を選択：</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ marginLeft: 10 }}
          >
            <option value="介護">介護</option>
            <option value="福祉">福祉</option>
            <option value="営業">営業</option>
            <option value="医療">医療</option>
            <option value="教育">教育</option>
            <option value="カスタマーサポート">カスタマーサポート</option>
          </select>
        </div>

        <textarea
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => { isComposing.current = true; }}
          onCompositionEnd={() => { isComposing.current = false; }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={industryPlaceholders[industry] || 'AIに話しかけてみよう'}
          style={{ width: '100%', marginBottom: 10 }}
        />

        <button onClick={handleSend} disabled={loading}>
          {loading ? '送信中...' : '送信'}
        </button>

        <div style={{ marginTop: 40 }}>
          <h3>チャット履歴：</h3>
          {selectedTopicIndex !== null && historyGroups[selectedTopicIndex] && (
            <div>
              <h4 style={{ textDecoration: 'underline' }}>🗂️ トピック: {historyGroups[selectedTopicIndex].topic}</h4>
              <ul>
                {historyGroups[selectedTopicIndex].history.map((entry, index) => (
                  <li key={index} style={{ marginBottom: 10 }}>
                    <strong>あなた：</strong> {entry.user}<br />
                    <strong>AI：</strong> {entry.ai}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
