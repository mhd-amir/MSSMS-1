/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { ink: '#101827', ocean: '#167c80', mist: '#f1f5f4' }, boxShadow: { card: '0 12px 40px rgba(20, 36, 48, .06)' } } },
  plugins: []
};
