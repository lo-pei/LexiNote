/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ln/editor', '@ln/types', '@ln/utils'],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
