import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai';
import type { Fields, Files } from 'formidable'; // ✅ 型用の補完

export const config = {
  api: {
    bodyParser: false,
  },
};

// 👇 formidable を Promiseベースで扱うためのヘルパー
const parseForm = (req: NextApiRequest) =>
  new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err || !files) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { files } = await parseForm(req);

    if (!files.file) {
      return res.status(400).json({ error: '音声ファイルが見つかりません' });
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const audioData = fs.readFileSync(file.filepath).toString('base64');
    

    const vertexAI = new VertexAI({
      project: process.env.PROJECT_ID!,
      location: process.env.LOCATION!,
    });

    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro-preview-0409',
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'この音声を日本語で要約してください。' },
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: audioData,
              },
            },
          ],
        },
      ],
    });

    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ summary: text });
  } catch (error) {
    console.error('❌ Gemini Audio API エラー:', error);
    res.status(500).json({ error: 'Gemini Audio 要約処理に失敗しました' });
  }
}