// src/components/Footer.tsx
import { useAppContext } from '../context/AppContext';

const Footer = () => {
  const { provider } = useAppContext();
  console.log('✅ Footerでのproviderの値:', provider); 

  const getProviderName = () => {
    switch (provider) {
      case 'openai':
        return 'ChatGPT'; // ← ✅ これを使うようにする
      case 'gemini':
        return 'Google Gemini';
      case 'claude':
        return 'Anthropic Claude';
      default:
        return 'AI Partner';
    }
  };  

  return (
    <footer className="footer-wrapper">
      <p className="powered-label">Powered by {getProviderName()}</p>
      <p className="powered-note">
  AIの回答は正確性を保証するものではありません。<br />
  重要な情報は必ずご自身でご確認ください。
</p>
      <img src="/このロゴで決定.png" alt="スター株式会社" className="company-logo" />
    </footer>
  );  
};

export default Footer;
