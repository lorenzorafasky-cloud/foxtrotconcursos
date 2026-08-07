export const foxtrotColors = {
  50: "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316",
  600: "#ea580c",
  700: "#c2410c",
  800: "#9a3412",
  900: "#7c2d12",
  950: "#431407"
} as const;

export const neutralColors = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  850: "#1f1f23",
  900: "#18181b",
  950: "#09090b"
} as const;

export const semanticColors = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#38bdf8"
} as const;

export const designTokens = {
  colors: {
    brand: foxtrotColors,
    neutral: neutralColors,
    semantic: semanticColors
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem"
  },
  shadow: {
    focus: "0 0 0 3px rgb(249 115 22 / 0.32)",
    panel: "0 18px 50px rgb(0 0 0 / 0.28)"
  },
  typography: {
    body: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
    display: ["Rajdhani", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
  }
} as const;
