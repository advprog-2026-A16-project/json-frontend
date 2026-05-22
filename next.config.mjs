const backendOrigin = (
  process.env.BACKEND_ORIGIN?.trim() || "http://100.51.43.194"
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
