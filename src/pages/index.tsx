import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('介護');
  const [companyName, setCompanyName] = useState('');
  const isComposing = useRef(false);

  const industryPlaceholders: Record<string, string> = {
    '介護': 'AIに話しかけてみよう（例：〇〇さんの記録を作成して）',
    '福祉': 'AIに話しかけてみよう（例：支援計画を作成して）',
    '営業': 'AIに話しかけてみよう（例：商談記録を作成して）',
    '医療': 'AIに話しかけてみよう（例：問診内容をまとめて）',
    '教育': 'AIに話しかけてみよう（例：生徒の学習記録を作成して）',
    'カスタマーサポート': 'AIに話しかけてみよう（例：お客様対応の記録を作成して）',
  };

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
      setInput('');
    } catch (err) {
      setReply('エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <p style={{ fontStyle: 'italic', marginBottom: 10, fontSize: '1.2em' }}>
        {companyName && <span style={{ fontWeight: 'bold' }}>{companyName}</span>} with AI Partner
        <br />
        <span style={{ fontWeight: 'bold' }}>Powered by ChatGPT</span>
      </p>

      <div style={{ marginBottom: 10 }}>
        <label>導入企業名：</label>
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
        onCompositionStart={() => {
          isComposing.current = true;
        }}
        onCompositionEnd={() => {
          isComposing.current = false;
        }}
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
      <div style={{ marginTop: 20 }}>
        <strong>AIの返答：</strong>
        <p>{reply}</p>
      </div>
    </div>
  );
}
