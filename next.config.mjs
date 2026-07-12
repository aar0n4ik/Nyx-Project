/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() { return [ { source: "/", destination: "/nyx/index.html", permanent: false } ] },
  async headers() {
    return [
      { source: "/api/actions/:path*", headers: [
        { key: "Access-Control-Allow-Origin", value: "*" },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids" },
      ] },
      { source: "/actions.json", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
    ]
  },
}
export default nextConfig
