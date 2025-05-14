// src/app/atom-simulator/page.tsx
"use client"; // クライアントコンポーネントを示す

import React from 'react';
import Link from 'next/link';
import AtomicSimulation from '@/components/AtomicSimulation';

export default function AtomSimulatorPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-600">
      {/* ヘッダー */}
      <header className="bg-black/30 backdrop-blur-sm p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            原子調合シミュレーション
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
          >
            ホームに戻る
          </Link>
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="flex-grow flex">
        <div className="w-full h-full">
          <AtomicSimulation />
        </div>
      </main>
    </div>
  );
}