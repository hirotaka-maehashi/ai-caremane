// src/pages/api/gemini.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { callGeminiAPI } from '../../lib/gemini';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  const { message, industry, model = 'gemini-pro' } = req.body;
  if (!message || !industry) return res.status(400).json({ error: 'Missing message or industry' });

  const { data: keyData } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .eq('provider', 'gemini')
    .single();

  if (!keyData?.api_key) return res.status(403).json({ error: 'Gemini APIキーがありません' });

  try {
    const reply = await callGeminiAPI({
      prompt: message,
      apiKey: keyData.api_key,
      model,
      industry,
    });
    res.status(200).json({ content: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini通信エラー' });
  }
}
