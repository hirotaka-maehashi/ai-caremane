import { useState } from 'react'
import { useRouter } from 'next/router'
// @ts-ignore
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message)
    } else {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('ユーザー取得に失敗しました');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !data?.api_key) {
        router.push('/apikey'); // 初回登録
      } else {
        router.push('/');
      }
    }
  }

  return (
    <div className="signup-container">
      <h1 className="signup-title">ログイン</h1>
      <form onSubmit={(e) => {
        e.preventDefault()
        handleLogin()
      }} className="signup-form">
        <div>
          <label htmlFor="email">メールアドレス</label>
          <input id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="password">パスワード</label>
          <input id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>
        <button type="submit">ログインする</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  )
}
