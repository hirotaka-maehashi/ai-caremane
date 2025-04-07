import { useState } from 'react'
import { useRouter } from 'next/router'
// @ts-ignore
import { supabase } from '../lib/supabaseClient' // ✅ 相対パス & 拡張子なし

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
    if (error) {
      setError(error.message);
    } else {
      // ✅ ログイン後、SupabaseからAPIキーを取得して判断
      const { data: { user } } = await supabase.auth.getUser();
  
      if (!user) {
        setError('ユーザー取得に失敗しました');
        return;
      }
  
      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .single();
  
      if (fetchError || !data || !data.api_key) {
        router.push('/apikey'); // ✅ APIキー未登録 → 入力ページへ
      } else {
        router.push('/'); // ✅ APIキーあり → チャット画面へ
      }
    }
  };  

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">ログイン</h1>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2"
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mb-2"
      />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
        ログイン
      </button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  )
}
