// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      // 使用するファイルのパスを指定
      "./src/app/**/*.{js,ts,jsx,tsx}",
      "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // wiggleアニメーションを定義
        keyframes: {
          wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' },
          },
        },
        animation: {
          wiggle: 'wiggle 0.3s ease-in-out infinite',
        },
      },
    },
    plugins: [],
  };
  