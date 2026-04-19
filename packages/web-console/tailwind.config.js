/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gh: {
          // canvas
          canvas:     '#f6f8fa',
          'canvas-subtle': '#f6f8fa',
          // header
          header:     '#24292f',
          'header-hover': '#32383f',
          // borders
          border:     '#d0d7de',
          'border-muted': '#d8dee4',
          // text
          fg:         '#1f2328',
          'fg-muted': '#636c76',
          'fg-subtle':'#818b98',
          // primary green button
          'btn-primary':       '#2da44e',
          'btn-primary-hover': '#2c974b',
          'btn-primary-border':'#1a7f37',
          // accent blue
          accent:     '#0969da',
          'accent-hover': '#0550ae',
          // danger
          danger:     '#d1242f',
          'danger-subtle': '#fff0ee',
          'danger-border': '#ff818266',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"'],
      },
      boxShadow: {
        'gh-sm':  '0 1px 0 rgba(31,35,40,0.04)',
        'gh-md':  '0 3px 6px rgba(140,149,159,0.15)',
        'gh-lg':  '0 8px 24px rgba(140,149,159,0.2)',
        'gh-overlay': '0 16px 32px rgba(140,149,159,0.2)',
      },
      borderRadius: {
        'gh': '6px',
      },
    },
  },
  plugins: [],
}
