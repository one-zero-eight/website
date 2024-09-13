// @ts-check

// PWA support
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/dashboard",
});

// Next.js config
/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: "standalone",
  swcMinify: false, // Hack for pdfjs
};

module.exports = withPWA(nextConfig);
