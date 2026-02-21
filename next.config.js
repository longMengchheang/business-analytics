/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./app/**/*"],
    },
  },
};

module.exports = nextConfig;
