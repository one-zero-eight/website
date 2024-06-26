// @ts-check

// PWA support
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/dashboard",
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.innohassle\.ru\/.*/i,
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "inh-api-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 10, // fall back to cache if api does not response within 10 seconds
        },
      },
    ],
  },
});

// Next.js config
/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: "standalone",
  swcMinify: false, // Hack for pdfjs
};

module.exports = withPWA(nextConfig);
