/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  // Transpile three.js related packages
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
}

module.exports = nextConfig
