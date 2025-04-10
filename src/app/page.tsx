// src/app/page.tsx
'use client' // ReactのuseState等のフロントエンド機能を有効にする

import { useState } from 'react'

export default function Home() {
  const [isClicked, setIsClicked] = useState(false)

  // クリック時に背景色を切り替えるハンドラ
  const handleClick = () => {
    setIsClicked(!isClicked)
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* タイトル */}
      <h2 className="text-4xl font-bold text-center mt-8">
        化学シミュレーション集
      </h2>

      {/* ホバー時にwiggleアニメーションさせる要素 */}
      <div
        className="
          w-48 h-48
          bg-blue-500 
          flex items-center justify-center
          rounded-xl shadow-lg
          text-white text-xl font-semibold
          hover:animate-wiggle
          transition
        "
      >
        Hover Me!
      </div>

      {/* クリック時に色が変わる要素 */}
      <button
        onClick={handleClick}
        className={`
          w-48 h-48
          ${isClicked ? 'bg-green-500' : 'bg-red-500'}
          flex items-center justify-center
          rounded-xl shadow-lg
          text-white text-xl font-semibold
          transition-colors duration-300
        `}
      >
        {isClicked ? 'Clicked!' : 'Click Me!'}
      </button>
    </div>
  )
}
