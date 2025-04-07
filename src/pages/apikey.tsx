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
      <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AIプロバイダー設定</h1>
    
      <form className="space-y-6">
       <div>
  <label className="block font-semibold mb-2">法人名（会社名）を入力：</label>
  <input
    type="text"
    placeholder="例：スター株式会社"
    value={clientName} // ← ★ 追加
    onChange={(e) => setClientName(e.target.value)} // ← ★ 追加
    className="w-full border border-gray-300 rounded px-3 py-2"
  />
</div>

  <label className="block font-semibold mb-2">AIプロバイダーを選択：</label>

  <table className="w-full">
  <tbody>
    {[
      { value: "openai", label: "ChatGPT（OpenAI）" },
      { value: "gemini", label: "Gemini（Google）" },
      { value: "claude", label: "Claude（Anthropic）" },
    ].map((option) => (
      <tr key={option.value}>
        <td className="pr-2 align-middle">
          <input
            type="radio"
            id={option.value}
            name="provider"
            value={option.value}
            checked={provider === option.value}
            onChange={() => setProvider(option.value as 'openai' | 'gemini' | 'claude')}

          />
        </td>
        <td className="align-middle">
          <label htmlFor={option.value} className="text-base">
            {option.label}
          </label>
        </td>
      </tr>
    ))}
  </tbody>
</table>
    
        <div>
          <label className="block font-semibold mb-2">APIキーを入力：</label>
          <input
  type="text"
  placeholder={placeholderMap[provider] || 'sk-xxxxxxxxxxxxxxx'}
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  className="w-full border border-gray-300 rounded px-3 py-2 font-mono"
/>
        </div>
    
        <div className="text-center">
          <button
            type="button"
            onClick={handleSave} 
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          >
            保存してチャット画面へ進む →
          </button>
        </div>
      </form>
    </div>
    );
  }