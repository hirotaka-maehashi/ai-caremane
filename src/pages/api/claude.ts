import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callClaude } from '../../lib/claude';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  console.log(`✅ ユーザー認証成功: ${user.id}`);

  const { message, model, industry } = req.body;
  if (!message || !model) return res.status(400).json({ error: 'Missing message or model' });

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'claude')
    .single();

  if (!keyData?.api_key) {
    console.error('❌ Claude APIキーが見つかりません');
    return res.status(403).json({ error: 'Claude APIキーが見つかりません' });
  }

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

  console.log(`📊 Claude使用状況: 使用済み ${usedTokens} / 上限 ${maxTokens}`);

  if (usedTokens >= maxTokens) {
    console.warn('🚫 トークン上限超過');
    return res.status(403).json({ error: '🚫 使用上限に達しました。月額制限をご確認ください。' });
  }

  try {
    console.log('📨 Claude呼び出し開始');
    const start = Date.now();

    const { reply, totalTokens } = await callClaude(keyData.api_key, model, industry, message);

    const end = Date.now();
    const duration = ((end - start) / 1000).toFixed(2);
    console.log(`✅ Claude呼び出し成功, トークン数: ${totalTokens}, 所要時間: ${duration} 秒`);

    await supabase
      .from('user_usage')
      .upsert({
        user_id: user.id,
        used_tokens: usedTokens + totalTokens,
        updated_at: new Date()
      });

    res.status(200).json({ content: reply });
  } catch (err) {
    console.error('❌ Claude APIエラー:', err);
    res.status(500).json({ error: 'Claude APIエラーが発生しました' });
  }
}
