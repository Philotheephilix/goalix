/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.stickpng.com",
        port: "",
        pathname: "/images/**",
      },

      {
        protocol: "https",
        hostname: "img.lemde.fr",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    // Goalix is EVM-only. Privy optionally imports Solana / Farcaster-Solana
    // modules we never use; alias them to empty stubs so webpack neither
    // resolves their (deep, missing) deps nor require()s them at runtime.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@solana/kit": false,
      "@solana/wallet-adapter-react": false,
      "@solana-program/system": false,
      "@solana-program/token": false,
      "@solana-program/memo": false,
      "@farcaster/mini-app-solana": false,
      "@farcaster/miniapp-sdk": false,
    };
    return config;
  },
};

export default nextConfig;
