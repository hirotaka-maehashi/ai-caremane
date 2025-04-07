// src/lib/saveChat.ts
import { supabase } from './supabaseClient'

type SaveChatProps = {
  provider: string
  industry: string
  user_message: string
  prompt?: string
}

export const saveChat = async ({
  provider,
  industry,
  user_message,
  prompt = '',
}: SaveChatProps) => {
  // ① ログインユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ ユーザー未ログインです')
    return
  }

  const user_id = user.id

  // ② user_profiles から company_id を取得
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user_id)
    .single()

  if (profileError || !profile?.company_id) {
    console.error('❌ company_id の取得に失敗しました')
    return
  }

  const company_id = profile.company_id

  // ③ chat_history に保存（user_id + company_id を含む）
  const { error: insertError } = await supabase.from('chat_history').insert([
    {
      user_id,
      company_id,
      provider,
      industry,
      user_message,
      prompt,
    },
  ])

  if (insertError) {
    console.error('❌ チャット保存エラー:', insertError.message)
  } else {
    console.log('✅ チャット履歴を保存しました！（法人連携OK）')
  }
}
