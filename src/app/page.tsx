// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">化学シミュレーション集</h1>
      <ul className="space-y-4">
        <li><Link className="text-blue-500 hover:underline" href="/element-simulator">Game 1</Link></li>
      </ul>
    </main>
  );
}
