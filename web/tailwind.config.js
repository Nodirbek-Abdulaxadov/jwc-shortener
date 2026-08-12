const PrimeUI = require('tailwindcss-primeui');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode is toggled by adding `.app-dark` on <html> (matches PrimeNG's
  // darkModeSelector below), driven by the ThemeService.
  darkMode: ['selector', '.app-dark'],
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {},
  },
  plugins: [PrimeUI],
};
