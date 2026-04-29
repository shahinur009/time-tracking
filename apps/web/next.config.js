/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: false,
    transpilePackages: ['@tt/shared'],
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
};

module.exports = nextConfig;
