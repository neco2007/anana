/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true, // これを追加してください！
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig