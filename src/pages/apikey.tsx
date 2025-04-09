import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAppContext } from '../context/AppContext'; // ← 追加
import { supabase } from '../lib/supabaseClient'; // ← これを追加！

export default function ApiKeyPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude'>('openai')
  const [saved, setSaved] = useState(false)
  const { setProvider: setGlobalProvider } = useAppContext(); // ← 追加
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    const fetchKey = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
  
      if (!user || userError) {
        console.warn('❌ ログインしていない、またはセッションが切れているため /login に移動します');
        router.push('/login');
        return;
      }
  
      console.log('✅ ログイン中のユーザーID:', user.id);
  
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('api_key, provider')
        .eq('user_id', user.id)
        .single();
  
      if (data) {
        console.log('✅ Supabaseから読み込んだ内容:', data);
        setApiKey(data.api_key);
        setProvider(data.provider);
        setGlobalProvider(data.provider);
      } else {
        console.log('ℹ️ Supabaseに保存されたデータがまだありません');
      }
    };
  
    fetchKey();
  }, []);  
  
  const handleSave = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
  
    if (!user || userError) {
      console.error('❌ ユーザー取得失敗:', userError);
      return;
    }
  
    console.log('✅ ユーザーID:', user.id);

    console.log('📦 保存する内容:', {
      provider,
      apiKey,
      clientName
    });
  
    const { error } = await supabase
    .from('user_api_keys')
    .upsert(
      [
        {
          user_id: user.id,
          provider,
          api_key: apiKey,
          client_name: clientName,
        }
      ],
      {
        onConflict: 'user_id,provider' //['user_id', 'provider']
      }
    );
    
      if (!error) {
        console.log('✅ Supabase に保存成功');
        setSaved(true);
        setApiKey('');
        router.push('/');
      } else {
        console.error('❌ Supabase保存エラー:', error); // ← ここ重要！
        alert('保存中にエラーが発生しました');
      }
  };  

  const placeholderMap: Record<string, string> = {
    chatgpt: 'sk-xxxxxxxxxxxx',
    gemini: 'AIzaSyxxxxxxxxxxxxxxx',
    claude: 'sk-ant-xxxxxxxxxx',
    mistral: 'sk-mis-xxxxxxxxxx',
    llama: 'access-token-xxxxxxxxxx'
  };
  
  return (
    <div className="signup-container">
      <h1 className="signup-title">AIプロバイダー設定</h1>
  
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="signup-form"
      >
        <div>
          <label htmlFor="clientName">法人名（会社名）を入力：</label>
          <input
            id="clientName"
            type="text"
            placeholder="例：スター株式会社"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>
  
        <div>
  <label className="block mb-2 font-semibold">AIプロバイダーを選択：</label>
  <div className="radio-group">
  {[
    { value: "openai", label: "ChatGPT（OpenAI）" },
    { value: "gemini", label: "Gemini（Google）" },
    { value: "claude", label: "Claude（Anthropic）" },
  ].map((option) => (
    <label key={option.value} className="radio-row">
      <input
        type="radio"
        name="provider"
        value={option.value}
        checked={provider === option.value}
        onChange={() =>
          setProvider(option.value as 'openai' | 'gemini' | 'claude')
        }
      />
      <span>{option.label}</span>
    </label>
  ))}
</div>
</div>

        <div>
          <label htmlFor="apiKey">APIキーを入力：</label>
          <input
            id="apiKey"
            type="text"
            placeholder={placeholderMap[provider] || 'sk-xxxxxxxxxxxx'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
  
        <div className="text-center">
          <button type="submit">保存してチャット画面へ進む →</button>
        </div>
  
        {saved && <p className="text-green-600 text-sm mt-2">✅ 保存に成功しました</p>}
      </form>
    </div>
  )
};  