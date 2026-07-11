/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/", destination: "/offside/index.html", permanent: false }];
  },
};
export default nextConfig;
