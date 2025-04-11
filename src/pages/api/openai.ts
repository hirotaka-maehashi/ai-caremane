// /pages/api/openai.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callOpenAI } from '../../lib/openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { message, industry, model = 'gpt-3.5-turbo' } = req.body;
  if (!message || !industry) return res.status(400).json({ error: 'Missing message or industry' });

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'openai')
    .single();

  if (!keyData?.api_key) return res.status(403).json({ error: 'OpenAI APIキーがありません' });

  try {
    const reply = await callOpenAI(message, keyData.api_key, industry, model);
    res.status(200).json({ content: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GPT通信エラー' });
  }
}
