// src/pages/api/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompts = {
  '介護': 'あなたは介護業界に詳しい日本語のAIアシスタントです。すべての返答は必ず丁寧な日本語で行ってください。',
  '福祉': 'あなたは福祉業界の専門家AIです。制度や支援サービスなどにも詳しく、丁寧な日本語で返答してください。',
  '営業': 'あなたは営業支援のためのAIです。顧客対応や提案資料の作成などに詳しく、丁寧にアドバイスしてください。',
  '医療': 'あなたは医療業界に精通したAIです。患者対応や医療用語にも詳しく、日本語で丁寧に説明してください。',
  '教育': 'あなたは教育現場を支援するAIです。教師や保護者、生徒に向けた日本語での丁寧な返答を心がけてください。',
  'カスタマーサポート': 'あなたはカスタマーサポート担当のAIです。お客様に対して丁寧で親切な日本語対応をしてください。'
};

export default async function handler(req, res) {
  const { message, industry } = req.body;

  const systemMessage = systemPrompts[industry] || 'あなたは丁寧な日本語で対応するAIアシスタントです。';

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    res.status(200).json({ reply: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error('APIエラー:', error);
    res.status(500).json({ error: 'OpenAI APIエラー' });
  }
}
