// src/pages/api/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  const { message } = req.body;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは介護業界に詳しい日本語のAIアシスタントです。すべての返答は必ず丁寧な日本語で行ってください。絶対に英語や中国語では返答しないでください。',
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