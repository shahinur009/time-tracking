/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    devIndicators: false,
    transpilePackages: ['@tt/shared'],
    redirects: async () => {
        return [
            {
                source: '/',
                destination: '/tracker',
                permanent: false,
            },
        ];
    },
};

module.exports = nextConfig;
