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
    <footer className="text-center text-sm text-gray-500 p-4">
      Powered by {getProviderName()}
    </footer>
  );
};

export default Footer;
