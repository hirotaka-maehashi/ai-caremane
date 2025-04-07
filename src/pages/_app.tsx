// src/pages/_app.tsx
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AppProvider } from '../context/AppContext' // ←追加

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Component {...pageProps} />
    </AppProvider>
  );
}
