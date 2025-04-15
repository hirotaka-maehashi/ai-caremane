// src/lib/gemini.ts
const systemPrompts: Record<string, string> = {
  '介護': 'あなたは介護業界に詳しい日本語のAIアシスタントです。すべての返答は必ず丁寧な日本語で行ってください。',
  '福祉': 'あなたは福祉業界の専門家AIです。制度や支援サービスなどにも詳しく、丁寧な日本語で返答してください。',
  '営業': 'あなたは営業支援のためのAIです。顧客対応や提案資料の作成などに詳しく、丁寧にアドバイスしてください。',
  '医療': 'あなたは医療業界に精通したAIです。患者対応や医療用語にも詳しく、日本語で丁寧に説明してください。',
  '教育': 'あなたは教育現場を支援するAIです。教師や保護者、生徒に向けた日本語での丁寧な返答を心がけてください。',
  'カスタマーサポート': 'あなたはカスタマーサポート担当のAIです。お客様に対して丁寧で親切な日本語対応をしてください。',
};

export async function callGeminiAPI({
  apiKey,
  prompt,
  model,
  industry,
}: {
  apiKey: string;
  prompt: string;
  model: string;
  industry?: string;
}): Promise<{ reply: string; totalTokens: number }> {
  const systemMessage =
    systemPrompts[industry || ''] || 'あなたは丁寧な日本語で対応するAIアシスタントです。';

  const body = {
    contents: [
      {
        parts: [
          { text: systemMessage },
          { text: prompt },
        ],
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Gemini API Error] HTTP ${res.status}:\n${errorText}`);
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '（Geminiからの返答がありませんでした）';

    // ✅ トークン概算（日本語なら約4文字 ≒ 1トークン）
    const estimatedTokens = Math.ceil((systemMessage.length + prompt.length + reply.length) / 4);

    console.log('🧠 Geminiの返答:', reply);
    console.log('📏 推定トークン数:', estimatedTokens);

    return {
      reply,
      totalTokens: estimatedTokens,
    };
  } catch (err) {
    console.error('[Gemini Error]', err);
    return {
      reply: 'Gemini API通信エラーが発生しました。',
      totalTokens: 0,
    };
  }
}