/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-blue': '#157CB2',
        'light-blue': '#3CADE8'
      },
      spacing: {
        18: '4.5rem'
      }
    }
  },
  plugins: [],
  purge: ['./src/**/*.{js,jsx,ts,tsx}']
};
