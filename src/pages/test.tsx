import { useEffect } from 'react'
import { saveChat } from '@/lib/saveChat'
import { getChatHistory } from '@/lib/getChatHistory'
import { supabase } from '@/lib/supabaseClient'

export default function TestPage() {
  useEffect(() => {
    const runTest = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('❌ ユーザー情報が取得できませんでした')
        return
      }
      
      console.log('ログイン中のユーザーID:', user.id) // 👈 追加！
      
      // ↓以下、保存処理へ続く      
      await saveChat({
        provider: 'openai',
        industry: 'カスタマーサポート',
        user_message: 'これは法人連携テストのメッセージです',
        prompt: 'カスタマー向けの応答',
      })

      // ② 保存された履歴を取得
      const history = await getChatHistory(user.id)
      console.log('✅ 取得した履歴:', history)
    }

    runTest()
  }, [])

  return <div>テストページです（保存 → 取得）</div>
}
