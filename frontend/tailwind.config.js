/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/components/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}",
    "./content/blog/**/*.{md,mdx}"
  ],
  theme: {
    extend: {
      // 必要ならブランド色やフォントをここで拡張
    }
  },
  plugins: [
    require("@tailwindcss/typography") // Markdown表示（prose）用
  ]
}
