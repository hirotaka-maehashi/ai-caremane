import React from 'react';

type Entry = {
  user: string;
  ai: string;
};

type HistoryGroup = {
  topic: string;
  history: Entry[];
};

type ChatHistoryProps = {
  selectedTopicIndex: number | null;
  historyGroups: HistoryGroup[];
};

export default function ChatHistory({ selectedTopicIndex, historyGroups }: ChatHistoryProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <h3>チャット履歴：</h3>
      {selectedTopicIndex !== null && historyGroups[selectedTopicIndex] && (
        <div>
          <h4 style={{ textDecoration: 'underline' }}>
            🗂️ トピック: {historyGroups[selectedTopicIndex].topic}
          </h4>
          <ul>
            {historyGroups[selectedTopicIndex].history.map((entry, index) => (
              <li key={index} style={{ marginBottom: 10 }}>
                <strong>あなた：</strong>{entry.user}<br />
                <strong>AI：</strong>{entry.ai}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 🔁 デザイン反映確認用ダミーコメント
