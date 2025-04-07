/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}", // ✅ ← 追加
    "./components/**/*.{js,ts,jsx,tsx}", // ✅ ← 追加
    "./app/**/*.{js,ts,jsx,tsx}", // ✅ ← App Router使用時に必要
    "./src/**/*.{js,ts,jsx,tsx}", // ← すでにあるものも残してOK
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
