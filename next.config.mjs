/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {},
  images: {
    unoptimized: true,
  },
  // Keep middleware on Edge; we use JWT decoding to avoid Node runtime
};

export default nextConfig;
