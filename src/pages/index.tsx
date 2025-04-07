import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import mammoth from 'mammoth';
// @ts-ignore
import { supabase } from '../lib/supabaseClient' // 
import Footer from '@/components/Footer';
import { useAppContext } from '../context/AppContext';

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('介護');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [historyGroups, setHistoryGroups] = useState<{ topic: string; history: { user: string; ai: string }[] }[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const isComposing = useRef(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileText, setUploadedFileText] = useState('');
  const [freeMode, setFreeMode] = useState(false);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const { provider, setProvider: setGlobalProvider } = useAppContext();

  useEffect(() => {
    const fetchApiKey = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
  
      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key, provider')
        .eq('user_id', user.id)
        .single();
  
      if (fetchError || !data || !data.api_key) {
        router.push('/apikey'); // 🔁 未登録なら設定画面へ
        return;
      }
  
      setApiKey(data.api_key);
      setGlobalProvider(data.provider);
    };
  
    fetchApiKey();
  }, []);  

  const templateSetsByClient: Record<string, Record<string, string[]>> = {
    'default': {
      '介護': [
        '',
        '日常生活の様子を記録してください',
        'モニタリング記録を作成してください',
        '長期目標と短期目標を立ててください',
        'サービス提供記録を作成してください',
        'ADLの変化をまとめてください',
        '入退院時の情報引き継ぎをまとめてください',
        'バイタルと体調の変化を記録してください',
        '家族とのやり取りを記録してください'
      ],
      '福祉': [
        '',
        '支援計画を作成してください',
        '個別支援計画のモニタリング記録を作成してください',
        'アセスメント内容をまとめてください',
        '本人の意向を反映した計画を提案してください',
        '支援チームへの申し送り内容を整理してください'
      ],
      '看護': [
        '',
        'バイタルサインと全身状態を記録してください',
        '実施した処置とその反応をまとめてください',
        '服薬状況と服薬支援の内容を記録してください',
        'ご家族への説明や連絡内容を記録してください',
        '次回訪問時の観察ポイントを整理してください',
      ],
      '営業': [
        '',
        '営業報告を作成してください',
        '商談内容を要約してください',
        '顧客のニーズを分析してください',
        '見積もり提案書の要点をまとめてください',
        '次回訪問のアクションプランを整理してください',
        '競合情報と自社優位性を比較してください'
      ],
      '教育': [
        '',
        '新人研修の記録を作成してください',
        'OJT内容を要点ごとにまとめてください',
        '研修評価コメントを考えてください',
        '自己評価シートの内容を整理してください',
        '振り返りシートのコメントを提案してください',
        '指導者からのアドバイスをまとめてください',
        'フィードバック記録を作成してください'
      ],
      'カスタマーサポート': [
        '',
        'お客様とのやり取りを記録してください',
        '対応内容を要約してください',
        'クレーム内容と対応を整理してください',
        '次回の対応方針を提案してください',
        'FAQに使える表現に変換してください'
      ]
    }
  };

  const promptTemplatesByIndustry = templateSetsByClient[clientId] || templateSetsByClient['default'];
  const promptOptions = freeMode ? [''] : promptTemplatesByIndustry[industry] || [''];

  useEffect(() => {
    const checkApiKey = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('🟢 ログイン中のユーザー:', user);
  
      if (error || !user) {
        console.warn('⚠️ 未ログイン状態なので /login に遷移');
        router.push('/login');
        return;
      }
  
      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key, provider, client_name')
        .eq('user_id', user.id)
        .single();
  
      console.log('📦 Supabaseから取得したAPIキー情報:', data);
  
      if (fetchError || !data || !data.api_key) {
        console.warn('❌ APIキーが見つからないため /apikey に遷移');
        router.push('/apikey');
        return;
      }
  
      setApiKey(data.api_key);
      setGlobalProvider(data.provider);
      setClientId(data.client_name || '');
      setGlobalProvider(data.provider || '');
    };
  
    checkApiKey();
  }, []);  

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
    if (!freeMode) {
      const newTemplates = promptTemplatesByIndustry[industry] || [''];
      setSelectedPrompt(newTemplates[0]);
    }
  }, [industry, freeMode]);

  const handleSend = async () => {
    if (!input.trim() && !uploadedFileText) return;
    setLoading(true);
  
    console.log('🧪 現在の provider:', provider);
    console.log('🧪 現在の apiKey:', apiKey);
    console.log('🧪 入力されたメッセージ:', input);
    console.log('🧪 アップロードされたファイル内容:', uploadedFileText);

    if (!apiKey) {
      alert('APIキーが設定されていません。/apikey にアクセスしてください。');
      setLoading(false);
      return;
    }
  
    const fullMessage = `${selectedPrompt}\n${input}${uploadedFileText ? '\n\n---\n以下はアップロードされたファイルの内容です:\n' + uploadedFileText : ''}`;
    const messages = freeMode
      ? [{ role: 'user', content: fullMessage }]
      : [
          { role: 'system', content: `業種: ${industry}` },
          { role: 'user', content: fullMessage },
        ];
  
    try {
      let replyContent = ''; // ← 共通で使えるようにする！
  
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages,
          }),
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);
        replyContent = data.choices[0].message.content;
        setReply(replyContent);
  
      } else if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/chat-bison:generateContent?key=${apiKey}`, {

          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullMessage }] }],
          }),
        });        
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        replyContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        setReply(replyContent);
  
      } else if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-instant-1.2',
            prompt: fullMessage,
            max_tokens_to_sample: 300,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        replyContent = data.completion;
        setReply(replyContent);
  
      } else {
        throw new Error('未対応のプロバイダーです');
      }
  
      // ✅ 履歴に追加（ここだけに setHistoryGroups を書く！）
      const newEntry = {
        user: uploadedFileText ? `${input}（ファイル: ${uploadedFileName}）` : input,
        ai: replyContent,
      };
  
      setHistoryGroups((prev) => {
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

      const { data, error } = await supabase.auth.getUser();
      if (!data?.user || error) {
        console.error('ユーザーが取得できませんでした');
        return;
      }
      
      await supabase.from('chat_history').insert({
        user_id: data.user.id,
        provider,
        industry,
        prompt: selectedPrompt,
        user_message: input,
        ai_reply: replyContent,
      });      

      // ✅ 入力リセット
      setInput('');
      setUploadedFileText('');
      setUploadedFileName('');
  
    } catch (err) {
      setReply('エラーが発生しました: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
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
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="p-4 bg-white shadow">
        <h1 className="text-xl font-semibold">AI Partner</h1>
      </header>
  
      {/* チャット本体エリア */}
      <main className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside className="w-[250px] bg-gray-100 p-4 overflow-y-auto">
          <h3>AI Partner</h3>
          <button onClick={handleNewTopic}>＋ 新しいトピック</button>
          <button
            onClick={handleLogout}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            ログアウト
          </button>
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
                    style={{ width: '80%' }}
                  />
                )}
                <button onClick={() => handleDeleteTopic(index)} style={{ marginLeft: 5, color: 'red' }}>削除</button>
              </li>
            ))}
          </ul>
        </aside>
  
        {/* チャット画面 */}
        <section className="flex-1 flex flex-col overflow-y-auto p-4">
          {/* 上部操作パネル */}
          <div className="mb-4">
            <label>業種を選択：</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="ml-2 border rounded px-2 py-1">
              {Object.keys(promptTemplatesByIndustry).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
  
            <label className="ml-6">自由入力モード：</label>
            <input
              type="checkbox"
              checked={freeMode}
              onChange={(e) => setFreeMode(e.target.checked)}
              className="ml-2"
            />
  
            <label className="ml-6">目的を選択：</label>
            <select
              value={selectedPrompt}
              onChange={(e) => setSelectedPrompt(e.target.value)}
              disabled={freeMode}
              className="ml-2 border rounded px-2 py-1"
            >
              {promptOptions.map((prompt, index) => (
                <option key={index} value={prompt}>{prompt || '自由入力'}</option>
              ))}
            </select>
          </div>
  
          {/* チャット入力 */}
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
            placeholder={promptOptions[0] || 'AIに話しかけてみよう'}
            className="w-full p-2 border rounded mb-4"
          />
  
          <button onClick={handleSend} disabled={loading} className="mb-4 bg-blue-500 text-white px-4 py-2 rounded">
            {loading ? '送信中...' : '送信'}
          </button>
  
          {/* ファイルドロップエリア */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-gray-400 p-4 text-center text-gray-500 rounded mb-4"
          >
            📂 ファイルをここにドラッグ＆ドロップしてください（PDF / Word / テキスト）<br />
            {uploadedFileName && <span className="text-gray-600 text-sm">アップロードされたファイル: {uploadedFileName}</span>}
          </div>
  
          {/* チャット履歴 */}
          <div className="mt-4">
            <h3 className="font-bold mb-2">チャット履歴：</h3>
            {selectedTopicIndex !== null && historyGroups[selectedTopicIndex] && (
              <div>
                <h4 className="underline mb-2">トピック: {historyGroups[selectedTopicIndex].topic}</h4>
                <ul>
                  {historyGroups[selectedTopicIndex].history.map((entry, index) => (
                    <li key={index} className="mb-4">
                      <strong>あなた：</strong> {entry.user}<br />
                      <strong>AI：</strong> {entry.ai}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Footer />
        </section>
      </main>
    </div>
  );
};  