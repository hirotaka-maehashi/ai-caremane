// src/pages/_app.tsx
import '../styles/globals.css'; // ← ✅ これで確実に読み込めます
import type { AppProps } from 'next/app'
import { AppProvider } from '../context/AppContext' // ←追加
import '../styles/form.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}

