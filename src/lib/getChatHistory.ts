// src/lib/getChatHistory.ts
import { supabase } from './supabaseClient'

export const getChatHistory = async (user_id: string) => {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 履歴取得エラー:', error.message)
    return []
  }

  return data
}
