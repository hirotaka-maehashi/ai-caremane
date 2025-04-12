// /pages/api/claude-models.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'claude')
    .single();

  if (!keyData?.api_key) return res.status(403).json({ error: 'Claude APIキーが見つかりません' });

  try {
    const fetchRes = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': keyData.api_key,
        'anthropic-version': '2023-06-01',
      },
    });

    const raw = await fetchRes.json();

    // ✅ models というキーで返すように変換
    res.status(200).json({ models: raw.data });
  } catch (err) {
    console.error('Claudeモデル取得エラー:', err);
    res.status(500).json({ error: 'モデル取得に失敗しました' });
  }
}
