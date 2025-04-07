import { useState } from 'react'
import { useRouter } from 'next/router'
// @ts-ignore
import { supabase } from '../lib/supabaseClient'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      setMessage('❌ 登録に失敗しました: ' + error.message)
    } else {
      setMessage('✅ 登録に成功しました！メールを確認してください。')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">📩 法人アカウント登録</h1>

      <input
        type="email"
        placeholder="法人メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-4 py-2 mb-3 w-full max-w-md"
      />

      <input
        type="password"
        placeholder="パスワード（8文字以上）"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border px-4 py-2 mb-4 w-full max-w-md"
      />

      <button
        onClick={handleSignup}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        登録する
      </button>

      {message && (
        <p className="mt-4 text-center text-sm max-w-md">{message}</p>
      )}
    </div>
  )
}

