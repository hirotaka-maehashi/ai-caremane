import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["http://192.168.11.6:3000"], // 👈 警告を回避
};

export default nextConfig;

