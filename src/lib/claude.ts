export async function callClaude(
    apiKey: string,
    model: string,
    industry: string,
    userMessage: string
  ): Promise<string> {
    const systemPrompts: Record<string, string> = {
      '介護': 'あなたは介護業界に詳しいAIアシスタントです。すべての返答は丁寧な日本語で行ってください。',
      '福祉': 'あなたは福祉業界の専門家AIです。支援制度や利用者対応に詳しく、丁寧に対応してください。',
      '営業': 'あなたは営業支援のためのAIです。提案や交渉に詳しく、丁寧にアドバイスしてください。',
      '医療': 'あなたは医療に精通したAIです。患者対応や医療用語に詳しく、日本語で丁寧に説明してください。',
      '教育': 'あなたは教育支援AIです。生徒・保護者・教師に向けて丁寧な説明を心がけてください。',
      'カスタマーサポート': 'あなたはカスタマーサポート向けAIです。お客様に対して丁寧かつ正確な対応を心がけてください。',
    };
  
    const systemMessage =
      systemPrompts[industry] || 'あなたは丁寧な日本語で応答するAIアシスタントです。';
  
    // ✅ Claudeに送る内容をログ
    console.log('📤 Claudeへの送信内容:', {
      model,
      system: systemMessage,
      message: userMessage
    });
  
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMessage,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });
  
    const data = await response.json();
    console.log('🧠 Claudeのレスポンス:', data);
  
    const content =
      data?.content?.[0]?.text ||
      data?.content?.text ||
      data?.message?.content?.[0]?.text ||
      JSON.stringify(data);
  
    return content;
  }

  // 🧪 強制デプロイ用コメント（Claude API確認）