// src/app/page.tsx

import Link from 'next/link'

export default function Home() {
  return (
    <main className="
      min-h-screen 
      bg-gradient-to-br from-indigo-800 via-purple-700 to-pink-500 
      flex items-center justify-center
      p-4
    ">
      {/* コンテンツを中央に配置 */}
      <div className="p-8 w-full max-w-6xl bg-white/10 backdrop-blur-md rounded-lg shadow-2xl">
        {/* ヘッダー部分 */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-widest mb-2">
            化学app <span className="inline-block">🔬</span>
          </h1>
          <p className="text-gray-200 md:text-lg">
            Let&apos;s Enjoy Chemical !!
          </p>
        </header>

        {/* 3カラムレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左列：シミュレーション */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              シミュレーション
            </h2>
            <ul className="space-y-4">
              <li>
                <Link
                  className="
                    block
                    w-full
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-blue-500 hover:bg-blue-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/element-simulator"
                >
                  電子配置シミュレーション
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full              
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-blue-500 hover:bg-blue-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/state-simulator"
                >
                  状態変化シミュレーション
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full              
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-blue-500 hover:bg-blue-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/3d-molecular"
                >
                  3D分子シミュレーション
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full              
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-blue-500 hover:bg-blue-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/crystal"
                >
                  結晶格子モデル
                </Link>
              </li>
            </ul>
          </div>

          {/* 中央列：ゲーム */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              ゲーム
            </h2>
            <ul className="space-y-4">
              <li>
                <Link
                  className="
                    block
                    w-full               
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-green-500 hover:bg-green-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/kemida"
                >
                  ケミ打
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full               
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-green-500 hover:bg-green-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="https://pacy727.github.io/base_chem_site/molmaster2.html"
                >
                  モル・マスターへの道
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full              
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-green-500 hover:bg-green-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="https://pacy727.github.io/base_chem_site/nurse_solution.html"
                >
                  nurse solution
                </Link>
              </li>
            </ul>
          </div>

          {/* 右列：その他 */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              その他
            </h2>
            <ul className="space-y-4">
            <li>
                <Link
                  className="
                    block
                    w-full
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-orange-500 hover:bg-orange-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="https://pacy727.github.io/base_chem_site/index.html"
                >
                  化学基礎攻略サイト
                </Link>
              </li>
              <li>
                <Link
                  className="
                    block
                    w-full
                    px-4 py-3 
                    text-base font-semibold 
                    text-center
                    text-white 
                    bg-orange-500 hover:bg-orange-600 
                    rounded-full 
                    shadow-md 
                    transition-all 
                    duration-300
                  "
                  href="/goo"
                >
                  癒しのグー
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}