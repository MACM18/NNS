/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to succeed even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {},
  images: {
    unoptimized: true,
  },
  // Keep middleware on Edge; we use JWT decoding to avoid Node runtime
};

export default nextConfig;
