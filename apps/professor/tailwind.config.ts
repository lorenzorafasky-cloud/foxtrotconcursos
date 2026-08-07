import type { Config } from "tailwindcss";
import tailwindPreset from "../../packages/ui/src/tailwind-preset";

const config: Config = {
  presets: [tailwindPreset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  plugins: []
};

export default config;
