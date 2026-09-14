import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.133", "192.168.1.*"],
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:8080/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
