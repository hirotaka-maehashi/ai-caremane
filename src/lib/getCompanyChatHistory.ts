// src/lib/getCompanyChatHistory.ts
import { supabase } from './supabaseClient'

export const getCompanyChatHistory = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ ユーザー情報取得エラー')
    return []
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    console.error('❌ company_id の取得に失敗しました')
    return []
  }

  const { data: chats, error: chatError } = await supabase
    .from('chat_history')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: true })

  if (chatError) {
    console.error('❌ チャット履歴取得に失敗しました')
    return []
  }

  return chats
}

// 🔁 デザイン反映確認用ダミーコメント
