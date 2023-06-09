/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: "standalone",
  env: {
    API_URL: process.env.API_URL,
  },
};

module.exports = nextConfig;
