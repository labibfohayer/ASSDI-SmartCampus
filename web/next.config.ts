import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const DEFAULT_API_URL = isProd
  ? "https://assdi-backend-egu4.onrender.com"
  : "http://localhost:8001";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  },
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
