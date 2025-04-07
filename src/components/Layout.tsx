import Footer from '@/components/Footer'; // ←追加

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 中身のチャットやUI */}
      <div className="flex-grow">ここにチャットなど</div>

      <Footer /> {/* ←一番下にフッター追加 */}
    </div>
  );
}
