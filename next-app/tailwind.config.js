/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Match existing app color scheme
        'f1-bg': '#111',
        'f1-card': '#0d0d0d',
        'f1-border': '#2a2a2a',
        'f1-text': '#eee',
        'f1-muted': '#888',
        'f1-green': '#2ecc40',
        'f1-red': '#e74c3c',
        'f1-yellow': '#f1c40f',
        'f1-orange': '#f39c12',
        'f1-purple': '#b57bee',
        'f1-blue': '#3498db',
      },
      fontFamily: {
        mono: ['ui-monospace', 'Menlo', 'Monaco', 'Cascadia Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
