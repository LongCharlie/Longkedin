import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---- React 19 + Compiler ----
  reactStrictMode: true,

  // ---- Image optimization ----
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // ---- Experimental ----
  experimental: {
    // React Compiler requires additional setup — enable in Phase 3
  },

  // ---- External packages for server components ----
  serverExternalPackages: ["@trpc/server"],

  // ---- Redirects ----
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/jobs",
        permanent: false,
      },
    ];
  },

  // ---- Turbopack (dev) ----
  turbopack: {
    // Empty for now; custom config here if needed
  },
};

export default nextConfig;
