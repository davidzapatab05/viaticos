const path = require('path')

process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

const withSerwist = require("@serwist/next").default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'graph.microsoft.com',
      },
    ],
  },
  env: {
    CLOUDFLARE_API_URL: process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL,
  },
  // Configurar el root del proyecto para evitar warning de múltiples lockfiles
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = withSerwist(nextConfig)
