/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {},
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{
      source: "/auth/password-update",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }];
  },
  // Keep middleware on Edge; we use JWT decoding to avoid Node runtime
};

export default nextConfig;
