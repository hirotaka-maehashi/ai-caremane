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
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [freeMode, setFreeMode] = useState(false);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const { provider, setProvider: setGlobalProvider } = useAppContext();
  const reversedHistoryGroups = [...historyGroups].reverse();
  const [sidebarOpen, setSidebarOpen] = useState(true);
 
  // 🔧 useState（上部）
const [isAddingNewTopic, setIsAddingNewTopic] = useState(false);
const [newTopicName, setNewTopicName] = useState('新しいトピック');
const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");

// 🔧 関数（中盤）
const handleCancelNewTopic = () => {
  setIsAddingNewTopic(false);
  setNewTopicName('');
};

  const handleClearUpload = () => {
    setUploadedFileName('');
    setUploadedFileText('');
    setUploadedFileUrl('');
  };  

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

  useEffect(() => {
    // SupabaseからAPIキー取得
  }, []);
  
  const handleSend = async () => {
    if (!input.trim() && !uploadedFileText) return;
    setLoading(true);
    let prompt = input;

    console.log("📤 使用中のモデル:", selectedModel);

// ✅ 画像がある場合
if (uploadedFileUrl && uploadedFileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
  prompt += `\n\n画像が添付されています: ${uploadedFileUrl}\nこの画像について説明してください。`;
}

// ✅ 音声がある場合
if (uploadedFileUrl && uploadedFileUrl.match(/\.(mp3|wav|m4a)$/i)) {
  prompt += `\n\n音声ファイルが添付されています: ${uploadedFileUrl}\n音声の内容についてご説明ください。`;
}

// ✅ ファイル内容（PDF / Word / Text）がある場合
if (uploadedFileText) {
  prompt += `\n\n---\n以下はアップロードされたファイルの内容です:\n${uploadedFileText}`;
}
  
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
  
    // ✅ PDF
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
  
    // ✅ Word (.docx)
    } else if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setUploadedFileText(result.value);
      };
      reader.readAsArrayBuffer(file);
  
    // ✅ テキストファイル
    } else if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result;
        if (typeof fileContent === 'string') {
          setUploadedFileText(fileContent);
        }
      };
      reader.readAsText(file);
  
   // ✅ 画像 or 音声ファイル（プレビュー用URLを生成）
} else if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
  const cleanFileName = file.name
    .replace(/\s/g, '_')              // 空白をアンダースコアに変換
    .replace(/[^\w.\-]/gi, '');       // 日本語・記号などを除去

  const filePath = `uploads/${Date.now()}_${cleanFileName}`;
  console.log('🛠 filePath:', filePath); // ← デバッグ用ログ

  const { error: uploadError } = await supabase.storage
    .from('uploads-v2') // ✅ ← バケット名を正しく
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ アップロード失敗:', uploadError.message);
    alert('ファイルのアップロードに失敗しました');
    return;
  }

  // ✅ 公開URLを取得（同じバケット名で！）
  const { data: publicUrlData } = supabase.storage
  .from('uploads-v2')
  .getPublicUrl(filePath);

if (!publicUrlData) {
  console.error('❌ 公開URLの取得に失敗しました');
  alert('公開URLの取得に失敗しました');
  return;
}

  const publicUrl = publicUrlData.publicUrl;
  console.log('✅ 公開URL:', publicUrl);

  setUploadedFileUrl(publicUrl); // ← AI に渡すためのURL
  setUploadedFileText('');
}
  };  

  const handleNewTopic = () => {
    const newGroup = { topic: '', history: [] }; // ← ここを空にする！
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

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);  

return (
  <div className="chat-layout">

  {sidebarOpen && (
  <div
    className="sidebar-overlay"
    onClick={() => setSidebarOpen(false)}
  />
)}
    {/* サイドバー */}
    <div className={`chat-sidebar ${sidebarOpen ? '' : 'closed'}`}>
  <div className="sidebar-scrollable">
  <div className="sidebar-header">
  <h3 className="sidebar-title">AI Partner</h3>
  <button onClick={handleNewTopic} className="new-topic-button">
  ＋ 新しいトピック
  </button>
  </div>

    {/* トピック一覧 */}
  <ul className="chat-topic-list">
  {historyGroups.map((group, index) => (
  <li key={index} className="topic-item">
    
    <div
  onClick={() => setSelectedTopicIndex(index)}
  className={`topic-title ${selectedTopicIndex === index ? 'selected' : ''} ${group.topic === '' ? 'new-topic-shrink' : ''}`}
>
  📁 {group.topic || 'タイトルを入力'}
</div>

{selectedTopicIndex === index && (
  <div className="topic-edit-block">
    <input
      type="text"
      value={group.topic}
      onChange={(e) => handleRenameTopic(index, e.target.value)}
      className="topic-input"
  />
    <button onClick={() => handleDeleteTopic(index)} className="delete-button">
    削除
    </button>
    </div>
          )}
        </li>
      ))}
    </ul>
  </div>
  
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="logout-button"
        >
          ログアウト
        </button>
      </div>
  
 {/* メインチャットエリア */}
  <div className="chat-body">
  {/* 左：フォーム */}
  <div className="form-area">

  <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sidebar-toggle-button"
      >
        ≡
      </button>

    <div className="form-group">
      <label>モデルを選択：</label>
      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
        <option value="gpt-3.5-turbo">GPT-3.5</option>
        <option value="gpt-4">GPT-4</option>
        <option value="gpt-4-turbo">GPT-4 Turbo</option>
      </select>
    </div>

    <div className="form-group">
      <label>業種を選択：</label>
      <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
        {Object.keys(promptTemplatesByIndustry).map((key) => (
          <option key={key} value={key}>{key}</option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label>自由入力モード：</label>
      <input
        type="checkbox"
        checked={freeMode}
        onChange={(e) => setFreeMode(e.target.checked)}
      />
    </div>

    <div className="form-group">
      <label>目的を選択：</label>
      <select
        value={selectedPrompt}
        onChange={(e) => setSelectedPrompt(e.target.value)}
        disabled={freeMode}
      >
        {promptOptions.map((prompt, index) => (
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
      placeholder={promptOptions[0] || 'AIに話しかけてみよう'}
      className="chat-textarea"
    />
  
  <button onClick={handleSend} disabled={loading} className="chat-button">
      {loading ? '送信中...' : '送信'}
    </button>

    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="file-drop-area"
    >
      📂 ファイルをここにドラッグ＆ドロップしてください（PDF / Word / テキスト / 画像 / 音声）
    </div>
  </div>

        {uploadedFileName && (
          <div className="uploaded-file-info">
            <p>
              アップロードされたファイル: <span>{uploadedFileName}</span>
            </p>
  
            {uploadedFileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) && (
              <img src={uploadedFileUrl} alt="アップロード画像" />
            )}
  
            {uploadedFileUrl?.match(/\.(mp3|wav|m4a)$/i) && (
              <audio controls>
                <source src={uploadedFileUrl} />
                お使いのブラウザでは音声を再生できません。
              </audio>
            )}
  
            <button
              onClick={handleClearUpload}
              className="delete-button"
            >
              このファイルを削除する
            </button>
          </div>
        )}
  
        <div className="chat-history-display">
  
          {typeof selectedTopicIndex === 'number' &&
           selectedTopicIndex >= 0 &&
           selectedTopicIndex < historyGroups.length ? (
            <div className="chat-topic-history">
          
   {/* 右：チャット履歴表示部分（元の chat-topic-history） */}
  <div className="chat-display">
    {/* ここにチャット履歴ブロックを表示 */}
    {selectedTopicIndex !== null && historyGroups[selectedTopicIndex] && (
      <div className="chat-topic-history">
        <h4 className="chat-topic-title">💬 {historyGroups[selectedTopicIndex].topic}</h4>
        <div className="chat-history-list">
          {historyGroups[selectedTopicIndex].history.map((entry, index) => (
            <div key={index}>
              <div className="chat-bubble-wrapper user">
                <div className="chat-bubble">
                  <span className="chat-role">あなた：</span>
                  {entry.user}
                </div>
              </div>
              <div className="chat-bubble-wrapper ai">
                <div className="chat-bubble">
                  <span className="chat-role">AI🤖：</span>
                  {entry.ai}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
          ) : (
            <p className="chat-history-empty">トピックが選択されていません。</p>
          )}
             <Footer />
        </div>
      </div>
    </div>
  );
};   