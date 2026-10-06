mobile.exports = {
  plugins: [
    require('postcss-import'),
    require('tailwindcss'),
    require('autoprefixer'),
    // Minify only during production builds
    ...(process.env.JEKYLL_ENV === 'production' ? [require('cssnano')({ preset: 'default' })] : [])
  ]
)
