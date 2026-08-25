/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-gold": "#fdca44",
        "brand-gold-hover": "#f5b722",
        "brand-gold-light": "#fef3c7",
        "brand-gold-dark": "#b45309",
        "brand-dark": "#0f172a",
        "background": "#f8fafc",
        "surface": "#ffffff",
        "surface-container": "#f1f5f9",
        "surface-container-low": "#f8fafc",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e2e8f0",
        "surface-container-highest": "#cbd5e1",
        "primary": "#0f172a",
        "primary-container": "#1e293b",
        "on-primary": "#ffffff",
        "on-primary-container": "#fdca44",
        "secondary": "#d97706",
        "secondary-container": "#fef3c7",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#92400e",
        "on-surface": "#0f172a",
        "on-surface-variant": "#64748b",
        "outline": "#cbd5e1",
        "outline-variant": "#e2e8f0",
        "error": "#ef4444",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",
        "inverse-surface": "#1e293b",
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        full: "9999px"
      },
      fontFamily: {
        display: ["Cairo", "sans-serif"],
        body: ["Cairo", "sans-serif"],
        mono: ["JetBrains Mono", "Cairo", "monospace"]
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'gold': '0 4px 15px -1px rgba(253, 202, 68, 0.35)',
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
      }
    },
  },
  plugins: [],
};
