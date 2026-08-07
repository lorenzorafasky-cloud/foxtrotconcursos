import { designTokens, foxtrotColors, neutralColors, semanticColors } from "./design-tokens";

const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        foxtrot: foxtrotColors,
        ink: neutralColors,
        success: semanticColors.success,
        warning: semanticColors.warning,
        danger: semanticColors.danger,
        info: semanticColors.info,
        surface: {
          canvas: "rgb(var(--surface-canvas) / <alpha-value>)",
          base: "rgb(var(--surface-base) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)"
        }
      },
      borderRadius: designTokens.radius,
      boxShadow: {
        focus: designTokens.shadow.focus,
        panel: designTokens.shadow.panel
      },
      fontFamily: {
        sans: designTokens.typography.body,
        display: designTokens.typography.display
      }
    }
  }
};

export default tailwindPreset;
