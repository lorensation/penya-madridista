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
  async headers() {
    return [
      {
        // Apply to pages that embed the Redsys InSite iframe
        source: "/(membership|tienda/:path*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Allow our own scripts + Redsys InSite JS (test & prod) + inline for Next.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sis-t.redsys.es:25443 https://sis.redsys.es https://www.googletagmanager.com",
              // Allow styles from self + inline (Tailwind/shadcn)
              "style-src 'self' 'unsafe-inline'",
              // Allow Redsys iframes (InSite creates internal iframes)
              "frame-src https://sis-t.redsys.es:25443 https://sis.redsys.es",
              // Allow API calls to Redsys REST + own API + Supabase
              "connect-src 'self' https://sis-t.redsys.es:25443 https://sis.redsys.es https://*.supabase.co",
              // Allow images from self + data URIs + Supabase storage
              "img-src 'self' data: blob: https://*.supabase.co https://maps.googleapis.com",
              // Allow fonts from self
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
