// src/lib/openai.ts
import OpenAI from 'openai';

const systemPrompts: Record<string, string> = {
  '介護': 'あなたは介護業界に詳しい日本語のAIアシスタントです。すべての返答は必ず丁寧な日本語で行ってください。',
  '福祉': 'あなたは福祉業界の専門家AIです。制度や支援サービスなどにも詳しく、丁寧な日本語で返答してください。',
  '営業': 'あなたは営業支援のためのAIです。顧客対応や提案資料の作成などに詳しく、丁寧にアドバイスしてください。',
  '医療': 'あなたは医療業界に精通したAIです。患者対応や医療用語にも詳しく、日本語で丁寧に説明してください。',
  '教育': 'あなたは教育現場を支援するAIです。教師や保護者、生徒に向けた日本語での丁寧な返答を心がけてください。',
  'カスタマーサポート': 'あなたはカスタマーサポート担当のAIです。お客様に対して丁寧で親切な日本語対応をしてください。',
};

export async function callOpenAI(
  message: string,
  apiKey: string,
  industry: string,
  model: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const systemMessage =
    systemPrompts[industry] || 'あなたは丁寧な日本語で対応するAIアシスタントです。';

  const chatCompletion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message },
    ],
  });

  // ❗ null 安全に返す
  return chatCompletion.choices?.[0]?.message?.content ?? '';
}

// 🔁 デザイン反映確認用ダミーコメント
