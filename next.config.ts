import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/maps/api/staticmap/**',
      },
    ],
  },
};

export default nextConfig;
