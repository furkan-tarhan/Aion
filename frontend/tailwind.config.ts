import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#21201e",
        foreground: "#fcf5e8",
        surface: "#191816",
        surfaceHover: "#302e2a",
        accent: "#e9bc1c",
        accentHover: "#f5c71b",
        muted: "#9a958b",
        border: "#3f3c38"
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-fast': 'spin 6s linear infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
