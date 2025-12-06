/**
 * Generates a diverse color palette for charts
 * Each series gets a unique, visually distinct color
 */

// Diverse color palette - 20 distinct colors
const DIVERSE_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#22c55e', // Green
  '#0ea5e9', // Sky
  '#a855f7', // Violet
  '#f43f5e', // Rose
  '#64748b', // Slate
  '#d946ef', // Fuchsia
  '#06b6d4', // Cyan
  '#fbbf24', // Amber light
];

/**
 * Generates a color palette with distinct colors for each series
 * @param {number} count - Number of colors needed
 * @param {string} baseColor - Optional base color to start from
 * @returns {Array<string>} Array of color hex codes
 */
export const generateDiverseColorPalette = (count, baseColor = null) => {
  if (count <= 0) return [];
  
  // If we need more colors than available, cycle through them
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(DIVERSE_COLORS[i % DIVERSE_COLORS.length]);
  }
  
  return colors;
};

/**
 * Generates a gradient color palette based on a base color
 * Useful for single-series charts or when you want related colors
 * @param {string} baseColor - Base color hex code
 * @param {number} count - Number of colors needed
 * @returns {Array<string>} Array of color hex codes
 */
export const generateGradientColorPalette = (baseColor, count) => {
  if (count <= 0) return [];
  
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const colors = [];
  for (let i = 0; i < count; i++) {
    // Create variations: lighter and darker shades
    const factor = 0.7 + (i * 0.1); // Vary between 0.7 and 1.7
    const newR = Math.min(255, Math.max(0, Math.round(r * factor)));
    const newG = Math.min(255, Math.max(0, Math.round(g * factor)));
    const newB = Math.min(255, Math.max(0, Math.round(b * factor)));
    colors.push(`rgb(${newR}, ${newG}, ${newB})`);
  }
  
  return colors;
};

/**
 * Gets a unique color for a specific index
 * @param {number} index - Index of the series
 * @param {string} baseColor - Optional base color
 * @returns {string} Color hex code
 */
export const getColorForIndex = (index, baseColor = null) => {
  return DIVERSE_COLORS[index % DIVERSE_COLORS.length];
};

export { DIVERSE_COLORS };

export default {
  generateDiverseColorPalette,
  generateGradientColorPalette,
  getColorForIndex,
  DIVERSE_COLORS
};

