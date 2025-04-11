import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ 環境変数が読み込まれているか確認（ログ）
console.log('✅ Supabase URL:', supabaseUrl)
console.log('✅ Supabase ANON KEY:', supabaseAnonKey)

// ✅ エラーを明示する
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase URL または ANON KEY が未設定です（.env.localを確認）');
}

// ✅ Supabaseクライアント生成
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
