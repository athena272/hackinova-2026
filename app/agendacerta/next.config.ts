import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita Next inferir root errado quando há outros lockfiles no usuário.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
