import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('介護');
  const [companyName, setCompanyName] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [historyGroups, setHistoryGroups] = useState<
    { topic: string; history: { user: string; ai: string }[] }[]
  >([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const isComposing = useRef(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileText, setUploadedFileText] = useState('');

  const industryPlaceholders: Record<string, string> = {
    介護: '〇〇さんのバイタル記録を作成して',
    福祉: '支援計画をまとめてください',
    営業: '顧客との商談記録を整理して',
    医療: '問診結果を要約して',
    教育: '授業内容の振り返りを要約して',
    カスタマーサポート: 'お客様対応の記録を作成して',
  };

  const promptTemplates = [
    '',
    '以下の内容を要約してください。',
    '以下の情報を使って計画書を作成してください。',
    '以下の内容から長期目標を立ててください。',
    '以下の営業内容とマニュアルを比較してください。',
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

    const fullMessage = `${selectedPrompt}\n${input}${
      uploadedFileText
        ? '\n\n---\n以下はアップロードされたファイルの内容です:\n' + uploadedFileText
        : ''
    }`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage, industry }),
      });
      const data = await res.json();
      setReply(data.reply);

      setHistoryGroups((prev) => {
        const newEntry = {
          user: uploadedFileText
            ? `${input}（ファイル: ${uploadedFileName}）`
            : input,
          ai: data.reply,
        };
        if (selectedTopicIndex === null) {
          const newGroup = {
            topic: input || uploadedFileName || '新しいトピック',
            history: [newEntry],
          };
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

  return (
    <div className="flex min-h-screen">
      {/* サイドバー */}
      <aside className="bg-blue-900 text-white w-64 p-4 hidden md:block">
        <h2 className="text-lg font-bold mb-6">AI Partner</h2>
        <button
          onClick={() => {
            const newGroup = { topic: '新しいトピック', history: [] };
            const updatedGroups = [...historyGroups, newGroup];
            setHistoryGroups(updatedGroups);
            setSelectedTopicIndex(updatedGroups.length - 1);
            setInput('');
          }}
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
      <main className="flex-1 bg-gray-50 p-6">
        <section className="bg-white p-6 rounded shadow mb-6">
          <p className="italic text-lg mb-4 font-medium">
            {companyName && <span className="font-bold">{companyName}</span>} with AI Partner<br />
            <span className="text-sm font-semibold text-gray-500">Powered by ChatGPT</span>
          </p>

          <div className="mb-4">
            <label className="block mb-1 text-sm text-gray-600">企業名：</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例：株式会社〇〇"
              className="w-full border border-gray-300 rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm text-gray-600">業種を選択：</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              {Object.keys(industryPlaceholders).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-sm text-gray-600">目的を選択：</label>
            <select
              value={selectedPrompt}
              onChange={(e) => setSelectedPrompt(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
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
            className="w-full border border-gray-300 rounded p-2 mb-4"
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '送信中...' : '送信'}
          </button>
        </section>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-gray-300 rounded p-6 text-center text-gray-500"
        >
          📂 ファイルをここにドラッグ＆ドロップしてください（PDF / Word / テキスト）<br />
          {uploadedFileName && (
            <span className="text-sm text-gray-600 mt-2 block">
              アップロードされたファイル: {uploadedFileName}
            </span>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">チャット履歴</h3>
          {selectedTopicIndex !== null && historyGroups[selectedTopicIndex] && (
            <ul className="space-y-4">
              {historyGroups[selectedTopicIndex].history.map((entry, index) => (
                <li key={index} className="bg-white p-4 rounded shadow">
                  <p className="text-sm"><strong>あなた：</strong> {entry.user}</p>
                  <p className="text-sm mt-2"><strong>AI：</strong> {entry.ai}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
