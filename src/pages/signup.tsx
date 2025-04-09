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
      password,
    })

    if (error) {
      setMessage('❌ 登録に失敗しました: ' + error.message)
    } else {
      setMessage('✅ 登録に成功しました！メールを確認してください。')
    }
  }

  return (
    <div className="signup-container">
      <h1 className="signup-title">法人アカウント登録</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSignup()
        }}
        className="signup-form"
      >
        <div>
          <label htmlFor="email">法人メールアドレス</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
          />
        </div>

        <div>
          <label htmlFor="password">パスワード（8文字以上）</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <button type="submit">登録する</button>

        {message && <p>{message}</p>}
      </form>
    </div>
  )
}
