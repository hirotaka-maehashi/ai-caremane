import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '@supabase/auth-helpers-react';
//import * as pdfjsLib from 'pdfjs-dist/build/pdf';
//import { GlobalWorkerOptions, version } from 'pdfjs-dist';
//GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

import mammoth from 'mammoth';
// @ts-ignore
import { supabase } from '../lib/supabaseClient' // 
import Footer from '@/components/Footer';
import { useAppContext } from '../context/AppContext';
import { FiPlus, FiMic, FiSend, FiUser } from 'react-icons/fi';
import { BsSoundwave } from 'react-icons/bs';
import { FiFile, FiFileText, FiImage, FiMusic} from 'react-icons/fi';
import { FiTrash } from 'react-icons/fi'; // ← 削除アイコン
import { FiPlusCircle } from 'react-icons/fi';
import { FiMessageSquare } from 'react-icons/fi';
import { BsRobot } from 'react-icons/bs';
import { BsChatDots } from 'react-icons/bs';
import { HiOutlineChatAlt2 } from 'react-icons/hi';
import { HiOutlineUser } from 'react-icons/hi';
import { FiPaperclip } from 'react-icons/fi';
import { FiUpload } from 'react-icons/fi';

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
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const reversedHistoryGroups = [...historyGroups].reverse();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 🎙️ 録音関係の state をここに追加！
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const [isRecording, setIsRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
const [userBudget, setUserBudget] = useState<number>(3000); // 月額希望（円）
const [monthlyTokenLimit, setMonthlyTokenLimit] = useState<number>(3000000); // トークン上限（3,000円なら300万）
const [dailyTokenLimit, setDailyTokenLimit] = useState<number>(100000); // 1日あたりの目安
const pricePer1K = 1; // gpt-3.5-turbo の単価（円／1000トークン）
const user = useUser();
const [usedTokenCount, setUsedTokenCount] = useState<number>(0);
const remainingTokens = monthlyTokenLimit - usedTokenCount;
const remainingYen = Math.floor(remainingTokens / 1000);
const remainingMan = (remainingTokens / 10000).toFixed(1); // 万トークン表示
const isLow = remainingTokens < 20000;
const usagePercent = Math.min(100, Math.floor((usedTokenCount / monthlyTokenLimit) * 100));
const usedMan = (usedTokenCount / 10000).toFixed(1);
const totalMan = (monthlyTokenLimit / 10000).toFixed(1);
// ✅ 使用率に応じてバーの色を変える
let barColor = "#4f46e5"; // 通常：青
if (usagePercent >= 90) {
  barColor = "#ef4444"; // 赤
} else if (usagePercent >= 70) {
  barColor = "#facc15"; // 黄
}

  const [modelOptions, setModelOptions] = useState<Record<string, { label: string; value: string }[]>>({
    openai: [],
    claude: [],
    gemini: [],
  });  
 
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    handleUploadedFile(file); 
  };  

  const handleUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
  
    handleUploadedFile(file); // ← handleFileDrop の代わりに、共通処理に渡す！
  };  

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
  
    const chunks: Blob[] = [];
  
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };
  
    mediaRecorder.start();
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };  

  const formatAsMan = (value: number) => {
    if (value >= 10000) return (value / 10000).toFixed(1) + '万';
    return value.toLocaleString();
  };  

  useEffect(() => {
    const checkApiKeyAndCompanyId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      console.log('🧪 現在のログインユーザーID:', user?.id);

      if (error || !user) {
        console.warn('⚠️ 未ログイン状態なので /login に遷移');
        router.push('/login');
        return;
      }
  
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
  
      if (profileError || !profile?.company_id) {
        console.error("❌ company_id の取得に失敗");
        return;
      }
  
      setUserCompanyId(profile.company_id);
  
      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key, provider, client_name')
        .eq('user_id', user.id)
        .single();
  
      if (
        !data ||
        ((data.provider === 'openai' || data.provider === 'gemini') && !data.api_key)
      ) {
        console.warn('❌ APIキーが見つからないため /apikey に遷移');
        router.push('/apikey');
        return;
      }
  
      if (data) {
        setApiKey(data.api_key);
        setGlobalProvider(data.provider);
        setClientId(data.client_name || '');
  
        // ✅ モデルも provider に応じて初期化
        const availableModels = modelOptions[data.provider] || [];
        if (availableModels.length > 0) {
          setSelectedModel(availableModels[0].value);
          console.log('✅ モデル初期化:', availableModels[0].value);
        }
      }
    };
  
    // ✅ 関数の外で呼び出す（←重要）
    checkApiKeyAndCompanyId();
  }, []);  
    
  const templateSetsByClient: Record<string, Record<string, string[]>> = {
    'default': {
      '介護': [
        '',
        '日常生活の様子を記録して下さい',
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
    const fetchTokenUsage = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
  
      const [{ data: usageData }, { data: limitData }] = await Promise.all([
        supabase.from('user_usage').select('used_tokens').eq('user_id', user.id).single(),
        supabase.from('user_limits').select('token_limit').eq('user_id', user.id).single(),
      ]);
  
      if (usageData?.used_tokens !== undefined) {
        setUsedTokenCount(usageData.used_tokens);
      }
      if (limitData?.token_limit !== undefined) {
        setMonthlyTokenLimit(limitData.token_limit);
      }
    };
  
    fetchTokenUsage();
  }, []);  

  useEffect(() => {
    if (!user || !user.id) return;
  
    const key = `chat-history-${user.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setHistoryGroups(JSON.parse(saved));
    }
  }, [user]);  

  useEffect(() => {
    if (!user || !user.id) return;
  
    const key = `chat-history-${user.id}`;
    localStorage.setItem(key, JSON.stringify(historyGroups));
  }, [historyGroups, user]);  

  useEffect(() => {
    setInput('');
    if (!freeMode) {
      const newTemplates = promptTemplatesByIndustry[industry] || [''];
      setSelectedPrompt(newTemplates[0]);
    }
  }, [industry, freeMode]);

  const [isUsageReady, setIsUsageReady] = useState(false);

  useEffect(() => {
    const fetchTokenUsage = async () => {
      setIsUsageReady(false);
  
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) return;
  
      const [{ data: usageData }, { data: limitData }] = await Promise.all([
        supabase.from('user_usage').select('used_tokens').eq('user_id', user.id).single(),
        supabase.from('user_limits').select('token_limit').eq('user_id', user.id).single(),
      ]);
  
      if (usageData?.used_tokens !== undefined) {
        setUsedTokenCount(usageData.used_tokens);
      }
  
      if (limitData?.token_limit !== undefined) {
        setMonthlyTokenLimit(limitData.token_limit);
      }
  
      setIsUsageReady(true);
    };
  
    fetchTokenUsage();
  }, []);  
  

  useEffect(() => {
    console.log('✅ 選択中モデル:', selectedModel);
  }, [selectedModel]);  

  useEffect(() => {
    console.log("📊 現在のモデルオプション:", modelOptions);
  }, [modelOptions]);  

  useEffect(() => {
    // SupabaseからAPIキー取得
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        if (!provider || !apiKey) return;
  
        if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          const data = await res.json();
  
          const ALLOWED_OPENAI = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
          const filtered = data.data
            .filter((m: any) => ALLOWED_OPENAI.includes(m.id))
            .map((m: any) => ({
              label: m.id === 'gpt-3.5-turbo' ? 'gpt-3.5-turbo（推奨）' : m.id,
              value: m.id,
            }));            
  
          setModelOptions((prev) => ({ ...prev, openai: filtered }));
        }
  
        if (provider === 'claude') {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
        
          if (sessionError || !session?.access_token) {
            alert('認証情報が取得できませんでした');
            setLoading(false);
            return;
          }
        
          const res = await fetch('/api/claude-models', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          });
        
          const data = await res.json();
        
          if (!data.models || !Array.isArray(data.models)) {
            console.warn("❗Claudeモデル一覧が取得できませんでした:", data);
            return;
          }
        
          const ALLOWED_CLAUDE = [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
          ];
          
          const filtered = data.models
            .filter((m: any) => ALLOWED_CLAUDE.includes(m.id))
            .map((m: any) => ({
              label: m.display_name || m.id,
              value: m.id,
            }));          
        
          setModelOptions((prev) => ({ ...prev, claude: filtered }));
        }        
  
        if (provider === 'gemini') {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const data = await res.json();
  
          const ALLOWED_GEMINI = ['gemini-2.0-pro', 'gemini-2.0-flash'];
          const filtered = data.models
            .filter((m: any) => {
              const name = m.name.replace('models/', '');
              return ALLOWED_GEMINI.includes(name);
            })
            .map((m: any) => ({
              label: m.displayName || m.name.replace('models/', ''),
              value: m.name.replace('models/', ''),
            }));
  
          setModelOptions((prev) => ({ ...prev, gemini: filtered }));
        }
      } catch (err) {
        console.error('モデル一覧取得失敗:', err);
      }
    };
  
    fetchModels();
  }, [provider, apiKey]);  

  useEffect(() => {
    if (provider && modelOptions[provider]?.length > 0) {
      setSelectedModel(modelOptions[provider][0].value);
    }
  }, [provider, modelOptions]);  
  
  useEffect(() => {
    if (!audioBlob) return;
  
    const sendAudioToGemini = async () => {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.webm');
  
      const res = await fetch('/api/gemini-audio', {
        method: 'POST',
        body: formData,
      });
  
      const data = await res.json();
  
      if (data.summary) {
        setReply(data.summary);
  
        setHistoryGroups((prev) => {
          const newEntry = {
            user: '🎙️ 録音メッセージ（音声）',
            ai: data.summary,
          };
  
          if (selectedTopicIndex === null) {
            const newGroup = {
              topic: '録音メッセージ',
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
      } else {
        setReply('❗要約に失敗しました');
      }
    };
  
    sendAudioToGemini();
  }, [audioBlob]);  

  useEffect(() => {
    console.log("🚀 useEffect 発動！"); 
    console.log("🚀 checkApiKeyAndCompanyId 発動！");

    const checkApiKeyAndCompanyId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('🟢 ログイン中のユーザー:', user);
  
      if (error || !user) {
        console.warn('⚠️ 未ログイン状態なので /login に遷移');
        router.push('/login');
        return;
      }
  
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

        console.log("🔍 Supabaseから取得した profile:", profile);
        console.log("✅ ログインユーザーの company_id:", profile?.company_id);
setUserCompanyId(profile?.company_id);
  
      if (profileError || !profile?.company_id) {
        console.error("❌ company_id の取得に失敗");
        return;
      }
  
      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key, provider, client_name')
        .eq('user_id', user.id)
        .single();
  
      console.log('📦 Supabaseから取得したAPIキー情報:', data);
      console.log('➡️ provider:', data?.provider);
console.log('➡️ api_key:', data?.api_key);
  
      if (fetchError || !data || !data.api_key) {
        console.warn('❌ APIキーが見つからないため /apikey に遷移');
        router.push('/apikey');
        return;
      }
  
      setApiKey(data.api_key);
      setGlobalProvider(data.provider);
      setClientId(data.client_name || '');
      
      // ✅ モデルもプロバイダーに応じて初期化
      const availableModels = modelOptions[data.provider] || [];
      if (availableModels.length > 0) {
        setSelectedModel(availableModels[0].value); // ← .value が超重要
        console.log('✅ モデル初期化:', availableModels[0].value);
      }      
    };
  
    checkApiKeyAndCompanyId();
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

    if ((provider === 'openai' || provider === 'gemini') && !apiKey) {
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
        const tokenRes = await supabase.auth.getSession();
        const accessToken = tokenRes?.data?.session?.access_token;
      
        if (!accessToken) {
          alert('認証トークンが取得できませんでした');
          setLoading(false);
          return;
        }
      
        const res = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`, // ← ✅ 修正ポイント
          },
          body: JSON.stringify({
            message: prompt,
            industry,
            model: selectedModel,
          }),
        });
      
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        replyContent = data.content;
        setReply(replyContent);      
    
  
      } else if (provider === 'gemini') {
        const model = selectedModel || 'gemini-pro';
      
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullMessage }] }],
            }),
          }
        );
      
        const data = await res.json();
        console.log("🧠 Geminiの返答 JSON:", data);
      
        if (data.error) {
          throw new Error(data.error.message);
        }
      
        const candidates = data?.candidates;
        const parts = candidates?.[0]?.content?.parts;
      
        if (!parts || parts.length === 0) {
          console.warn("⚠️ Geminiの返答が空です。構造:", candidates);
        }
      
        replyContent = parts?.[0]?.text || '（Geminiからの返答がありませんでした）'; // ✅ 修正ポイント！
        setReply(replyContent);
        console.log("📨 Geminiの返答テキスト:", replyContent);
           
        
      } else if (provider === 'claude') {
        const { data, error: sessionError } = await supabase.auth.getSession();
        const session = data?.session;
      
        console.log("🟡 Claude送信直前のsession:", session);
        console.log("🎯 Claude access_token:", session?.access_token);
        console.log("🧮 Claude送信時の token_limit:", monthlyTokenLimit);
      
        if (sessionError || !session?.access_token) {
          alert('認証トークンが取得できませんでした（Claude）');
          setLoading(false);
          return;
        }
      
        console.log('🎯 Claudeに送るモデル:', selectedModel);
      
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: fullMessage,
            model: selectedModel,
            industry,
          }),
        });
      
        const response = await res.json(); // ← 修正ポイント！
        if (response.error) throw new Error(response.error);
        replyContent = response.content;
        setReply(replyContent);
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
        company_id: userCompanyId,
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
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
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
}

// ✅ Word (.docx)
else if (file.name.endsWith('.docx')) {
  const reader = new FileReader();
  reader.onload = async () => {
    const arrayBuffer = reader.result as ArrayBuffer;
    const result = await mammoth.extractRawText({ arrayBuffer });
    setUploadedFileText(result.value);
  };
  reader.readAsArrayBuffer(file);
}

// ✅ テキストファイル
else if (file.type.startsWith('text/')) {
  const reader = new FileReader();
  reader.onload = () => {
    const fileContent = reader.result;
    if (typeof fileContent === 'string') {
      setUploadedFileText(fileContent);
    }
  };
  reader.readAsText(file);
}

// ✅ 画像 or 音声ファイル（Supabase にアップロード）
else if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
  const cleanFileName = file.name
    .replace(/\s/g, '_')
    .replace(/[^\w.\-]/gi, '');

  const filePath = `uploads/${Date.now()}_${cleanFileName}`;
  const { error: uploadError } = await supabase.storage
    .from('uploads-v2')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ アップロード失敗:', uploadError.message);
    alert('ファイルのアップロードに失敗しました');
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from('uploads-v2')
    .getPublicUrl(filePath);

  if (!publicUrlData) {
    alert('公開URLの取得に失敗しました');
    return;
  }

  const publicUrl = publicUrlData.publicUrl;
  setUploadedFileUrl(publicUrl);
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

const formattedMonthly = formatAsMan(monthlyTokenLimit);  // 例: '300万'
const formattedDaily = formatAsMan(dailyTokenLimit);      // 例: '10.0万'
const dailyYen = Math.floor(userBudget / 30);             // 例: 100円

const limitText = `上限：${formattedMonthly}トークン（約${userBudget.toLocaleString()}円）｜1日：${formattedDaily}トークン（約${dailyYen}円）`;

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
  <FiPlusCircle size={16} />
  新規スレッド
</button>
          </div>
  
          {/* トピック一覧 */}
          <ul className="chat-topic-list">
            {historyGroups.map((group, index) => (
             <li key={index} className="topic-item">
             <div className="topic-row">
               <FiFileText className="topic-icon" />
               <input
                 type="text"
                 value={group.topic}
                 placeholder="タイトルを入力"
                 onChange={(e) => handleRenameTopic(index, e.target.value)}
                 className="topic-input"
                 onClick={() => setSelectedTopicIndex(index)}
               />
             </div>
           
             {/* 削除ボタンだけ下に配置 */}
             <div className="delete-wrapper">
               <button
                 onClick={() => handleDeleteTopic(index)}
                 className="delete-button"
               >
                 <FiTrash />
                 削除
               </button>
             </div>
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
  <label htmlFor="budgetInput" className="form-label">
    月額上限（円）
  </label>

  <p className={`token-usage-info ${isLow ? 'token-usage-warning' : ''}`}>
  残り：{remainingMan}万トークン（約{remainingYen.toLocaleString()}円）
</p>

  <input
    id="budgetInput"
    type="number"
    value={userBudget}
    onChange={(e) => {
      const newBudget = Number(e.target.value);
      setUserBudget(newBudget);

      const calculatedTokenLimit = Math.floor((newBudget / pricePer1K) * 1000);
      setMonthlyTokenLimit(calculatedTokenLimit);
      setDailyTokenLimit(Math.floor(calculatedTokenLimit / 30));
    }}
    placeholder="例：3000"
    min={0}
    className="budget-input"
  />

<p className="form-subtext">{limitText}</p>

{/* ✅ トークン使用量の進捗バー */}
{isUsageReady && (
  <>
    <div className="token-progress-bar">
      <div className="progress-fill" style={{ width: `${usagePercent}%`, backgroundColor: barColor }} />
    </div>
    <p className="progress-text">
      {usedMan}万 / {totalMan}万トークン使用（{usagePercent}%）
    </p>
  </>
)}

  <p className="form-hint">※上限を入力し、「保存」を押してください。</p>

  <div className="button-row">
    <button
      type="button"
      className="save-button"
      onClick={async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          alert("ログイン情報が確認できませんでした");
          return;
        }

        const { error: upsertError } = await supabase.from('user_limits').upsert({
          id: user.id,
          user_id: user.id,
          monthly_budget_yen: userBudget,
          token_limit: monthlyTokenLimit,
          updated_at: new Date()
        });

        if (upsertError) {
          alert("保存に失敗しました");
        } else {
          alert("✅ 上限情報を保存しました！");
        }
      }}
    >
      保存
    </button>
  </div>
</div>

    <div className="form-group">
      <label>モデルを選んでください：</label>
      <select
  value={selectedModel}
  onChange={(e) => setSelectedModel(e.target.value)}
>
  {(modelOptions[provider] || []).map((model) => (
    <option key={model.value} value={model.value}>
      {model.label}
    </option>
  ))}
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
  
  <div className="chat-actions-bar">
  <label htmlFor="fileInput" className="action-button">
    <FiPlus size={20} />
  </label>
  <input
    id="fileInput"
    type="file"
    accept="image/*,application/pdf,audio/*"
    style={{ display: 'none' }}
    onChange={handleFileUpload}
  />
<button
  className="action-button"
  onClick={isRecording ? stopRecording : startRecording}
  style={{ color: isRecording ? 'red' : undefined }}
>
  {isRecording ? '■' : <FiMic size={20} />}
</button>

  <button className="action-button">
    <BsSoundwave size={20} />
  </button>

<button
  onClick={handleSend}
  disabled={loading || !userCompanyId}
  className="send-button"
>
  {loading ? (
    <span className="spinner" />
  ) : (
    <FiSend size={20} />
  )}
</button>
</div>

    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="file-drop-area"
    >
       <FiUpload style={{ marginRight: '8px', fontSize: '18px' }} />
      ファイルをここにドラッグ＆ドロップしてください（PDF / Word / テキスト / 画像 / 音声）
    </div>
  </div>

  {uploadedFileName && (
  <div className="file-preview">
    <div className="file-header">
      <FiPaperclip className="file-icon" />
      <h4 className="preview-title">アップロードされたファイル</h4>
    </div>

    <div className="file-header">
      <span className="file-icon">
        {uploadedFileName.match(/\.(pdf)$/i) && <FiFileText />}
        {uploadedFileName.match(/\.(docx)$/i) && <FiFile />}
        {uploadedFileName.match(/\.(jpg|jpeg|png|gif)$/i) && <FiImage />}
        {uploadedFileName.match(/\.(mp3|wav|m4a)$/i) && <FiMusic />}
        {uploadedFileName.match(/\.(txt)$/i) && <FiFileText />}
      </span>
      <span className="file-name">{uploadedFileName}</span>
      <button onClick={handleClearUpload} className="delete-button">
        <FiTrash style={{ marginRight: '6px' }} />
        削除
      </button>
    </div>

    {uploadedFileText && (
      <pre className="preview-content">{uploadedFileText}</pre>
    )}
    {uploadedFileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) && (
      <img src={uploadedFileUrl} alt="画像プレビュー" className="preview-image" />
    )}
    {uploadedFileUrl?.match(/\.(mp3|wav|m4a)$/i) && (
      <audio controls className="preview-audio">
        <source src={uploadedFileUrl} />
        お使いのブラウザでは音声を再生できません。
      </audio>
    )}
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
        <h4 className="chat-topic-title"><HiOutlineChatAlt2 style={{ marginRight: '6px' }} />
          {historyGroups[selectedTopicIndex].topic}</h4>
        <div className="chat-history-list">
          {historyGroups[selectedTopicIndex].history.map((entry, index) => (
            <div key={index}>
              <div className="chat-bubble-wrapper user">
                <div className="chat-bubble">
                  <span className="chat-role"> <FiUser style={{ marginRight: '6px', fontSize: '16px', color: '#666' }} />
                  あなた：</span>
                  {entry.user}
                </div>
              </div>
              <div className="chat-bubble-wrapper ai">
                <div className="chat-bubble">
                  <span className="chat-role"> <BsRobot style={{ marginRight: '6px', fontSize: '16px', color: '#fff' }} />
                    AI：</span>
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
//