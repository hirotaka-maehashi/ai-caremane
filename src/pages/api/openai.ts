import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callOpenAI } from '../../lib/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    console.error('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  // ✅ Supabaseクライアントを「token付きで」再生成する
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  // ✅ この後に getUser を実行することで token が正しく使われる
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('❌ Invalid token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }

  console.log('✅ user.id:', user.id);

  const { message, industry, model = 'gpt-3.5-turbo' } = req.body;
  if (!message || !industry) {
    console.error('❌ message または industry が不足');
    return res.status(400).json({ error: 'Missing message or industry' });
  }

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'openai')
    .single();

  if (!keyData?.api_key) {
    console.error('❌ OpenAI APIキーが見つからない（user_api_keys）');
    return res.status(403).json({ error: 'OpenAI APIキーがありません' });
  }

  console.log('✅ OpenAI APIキー取得成功');

  const { data: limitData } = await supabase
    .from('user_limits')
    .select('token_limit')
    .eq('user_id', user.id)
    .single();

  const { data: usageData } = await supabase
    .from('user_usage')
    .select('used_tokens')
    .eq('user_id', user.id)
    .single();

  const usedTokens = usageData?.used_tokens || 0;
  const maxTokens = limitData?.token_limit || 0;

  console.log(`📊 使用済みトークン: ${usedTokens}, 上限: ${maxTokens}`);

  if (usedTokens >= maxTokens) {
    console.error('❌ 使用上限に達しています');
    return res.status(403).json({ error: '🚫 使用上限に達しました。月額制限をご確認ください。' });
  }

  try {
    console.log('📨 OpenAI呼び出し開始');
    const { reply, totalTokens } = await callOpenAI(message, keyData.api_key, industry, model);

    console.log(`✅ OpenAI呼び出し成功、使用トークン数: ${totalTokens}`);

    await supabase
      .from('user_usage')
      .upsert({
        user_id: user.id,
        used_tokens: usedTokens + totalTokens,
        updated_at: new Date()
      });

    res.status(200).json({ content: reply });
  } catch (err) {
    console.error('❌ GPT通信エラー:', err);
    res.status(500).json({ error: 'GPT通信エラー' });
  }
}
