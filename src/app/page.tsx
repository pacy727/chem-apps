// src/app/page.tsx

import Link from 'next/link'

export default function Home() {
  return (
    <main className="
      min-h-screen 
      bg-gradient-to-br from-indigo-800 via-purple-700 to-pink-500 
      flex items-center justify-center
    ">
      {/* コンテンツを中央に配置 */}
      <div className="p-8 w-full max-w-3xl bg-white/10 backdrop-blur-md rounded-lg shadow-2xl">
        {/* ヘッダー部分 */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-widest mb-2">
            化学シミュレーション集 <span className="inline-block">🔬</span>
          </h1>
          <p className="text-gray-200 md:text-lg">
            Reactions, Elements, and Endless Possibilities
          </p>
        </header>

        {/* コンテンツリンク部分 */}
        <ul className="space-y-5 text-center">
          <li>
            <Link
              className="
                inline-block 
                px-6 py-3 
                text-lg font-semibold 
                text-white 
                bg-blue-500 hover:bg-blue-600 
                rounded-full 
                shadow-md 
                transition-all 
                duration-300
              "
              href="/element-simulator"
            >
              Element Simulator
            </Link>
          </li>
          {/* ほかのゲームへのリンクを増やす場合はここに追加 */}
        </ul>
      </div>
    </main>
  )
}
