import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callClaude } from '../../lib/claude';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { message, model, industry } = req.body;
  if (!message || !model) return res.status(400).json({ error: 'Missing message or model' });

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'claude')
    .single();

  if (!keyData?.api_key) return res.status(403).json({ error: 'Claude APIキーが見つかりません' });

  try {
    const content = await callClaude(keyData.api_key, model, industry, message);
    res.status(200).json({ content });
  } catch (err) {
    console.error('Claude APIエラー:', err);
    res.status(500).json({ error: 'Claude APIエラーが発生しました' });
  }
}
