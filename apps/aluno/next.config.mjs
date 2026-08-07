const nextConfig = {
  transpilePackages: ["@foxtrot/ui", "@foxtrot/shared-types"],
  async rewrites() {
    return [{ source: "/questoes/:path*", destination: "/questoes/:path*" }];
  }
};

export default nextConfig;
