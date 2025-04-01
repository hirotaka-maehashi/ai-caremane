import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('介護');
  const [companyName, setCompanyName] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [historyGroups, setHistoryGroups] = useState<{ topic: string; history: { user: string; ai: string }[] }[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const isComposing = useRef(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileText, setUploadedFileText] = useState('');

  const industryPlaceholders: Record<string, string> = {
    '介護': 'AIに話しかけてみよう（例：〇〇さんの記録を作成して）',
    '福祉': 'AIに話しかけてみよう（例：支援計画を作成して）',
    '営業': 'AIに話しかけてみよう（例：商談記録を作成して）',
    '医療': 'AIに話しかけてみよう（例：問診内容をまとめて）',
    '教育': 'AIに話しかけてみよう（例：生徒の学習記録を作成して）',
    'カスタマーサポート': 'AIに話しかけてみよう（例：お客様対応の記録を作成して）',
  };

  const promptTemplates = [
    '',
    '以下の内容を要約してください。',
    '以下の情報を使って計画書を作成してください。',
    '以下の内容から長期目標を立ててください。',
    '以下の営業内容とマニュアルを比較してください。'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('chat-history');
    if (saved) {
      setHistoryGroups(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-history', JSON.stringify(historyGroups));
  }, [historyGroups]);

  useEffect(() => {
    setInput('');
  }, [industry]);

  const handleSend = async () => {
    if (!input.trim() && !uploadedFileText) return;
    setLoading(true);
    const fullMessage = `${selectedPrompt}\n${input}${uploadedFileText ? '\n\n---\n以下はアップロードされたファイルの内容です:\n' + uploadedFileText : ''}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage, industry }),
      });
      const data = await res.json();
      setReply(data.reply);

      setHistoryGroups((prev) => {
        const newEntry = { user: uploadedFileText ? `${input}（ファイル: ${uploadedFileName}）` : input, ai: data.reply };
        if (selectedTopicIndex === null) {
          const newGroup = { topic: input || uploadedFileName || '新しいトピック', history: [newEntry] };
          const newGroups = [...prev, newGroup];
          setSelectedTopicIndex(newGroups.length - 1);
          return newGroups;
        } else {
          return prev.map((group, index) =>
            index === selectedTopicIndex
              ? { ...group, history: [...group.history, newEntry] }
              : group
          );
        }
      });

      setInput('');
      setUploadedFileText('');
      setUploadedFileName('');
    } catch (err) {
      setReply('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setUploadedFileName(file.name);

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          text += strings.join(' ') + '\n';
        }
        setUploadedFileText(text);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setUploadedFileText(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result;
        if (typeof fileContent === 'string') {
          setUploadedFileText(fileContent);
        }
      };
      reader.readAsText(file);
    } else {
      alert('対応していないファイル形式です。PDF、Word（.docx）、またはテキストファイルをアップロードしてください。');
    }
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

  const handleDeleteTopic = (index: number) => {
    const updated = [...historyGroups];
    updated.splice(index, 1);
    setHistoryGroups(updated);
    if (selectedTopicIndex === index) {
      setSelectedTopicIndex(null);
    } else if (selectedTopicIndex !== null && selectedTopicIndex > index) {
      setSelectedTopicIndex(selectedTopicIndex - 1);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">  
  {/* サイドバー */}
  <aside className="bg-blue-900 text-white w-64 p-4 hidden md:block">
  <h2 className="text-lg font-bold mb-6">AI Partner</h2>
  <button
    onClick={handleNewTopic}
    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4"
  >
    ＋ 新しいトピック
  </button>
  <ul className="space-y-2">
    {historyGroups.map((group, index) => (
      <li key={index}>
        <button
          onClick={() => setSelectedTopicIndex(index)}
          className={`block text-left w-full px-3 py-2 rounded ${
            selectedTopicIndex === index ? 'bg-blue-800' : 'hover:bg-blue-800'
          }`}
        >
          {group.topic}
        </button>
      </li>
    ))}
   </ul>
</aside>

{/* メインエリア */}
<div className="main" style={{ flex: 1, padding: 20 }}>
        <p style={{ fontStyle: 'italic', marginBottom: 10, fontSize: '1.2em' }}>
          {companyName && <span style={{ fontWeight: 'bold' }}>{companyName}</span>} with AI Partner<br />
          <span style={{ fontWeight: 'bold', color: 'black' }}>Powered by ChatGPT</span>
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
            {Object.keys(industryPlaceholders).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>目的を選択：</label>
          <select
            value={selectedPrompt}
            onChange={(e) => setSelectedPrompt(e.target.value)}
            style={{ marginLeft: 10 }}
          >
            {promptTemplates.map((prompt, index) => (
              <option key={index} value={prompt}>{prompt || '自由入力'}</option>
            ))}
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

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          style={{
            border: '2px dashed #ccc',
            padding: 20,
            marginTop: 20,
            textAlign: 'center',
            color: '#888',
            borderRadius: 10,
          }}
        >
          📂 ファイルをここにドラッグ＆ドロップしてください（PDF / Word / テキスト）<br />
          {uploadedFileName && <span style={{ color: '#555', fontSize: '0.9em' }}>アップロードされたファイル: {uploadedFileName}</span>}
        </div>

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