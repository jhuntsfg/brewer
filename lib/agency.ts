/**
 * AGENCY CONFIG — edit this file when deploying for a new agency.
 * All agency-specific branding and identity lives here.
 */
export const AGENCY = {
  /** Display name used throughout the UI */
  name: "Hunt Agency",

  /**
   * Brand colors — also update app/globals.css @theme block to match.
   * These are kept here for reference; Tailwind reads them from CSS.
   *
   * primary:       #637777   (muted teal — headers, checkboxes, buttons)
   * primaryLight:  #e4ecec   (pale teal — checked backgrounds)
   * primaryDark:   #4a5f5f   (darker teal — hover states)
   * warm:          #7c5a3e   (brown — admin accents)
   * warmLight:     #f2ebe3   (pale warm — admin backgrounds)
   * sky:           #a0c3d1   (sky blue — confetti accent)
   * background:    #f4f1ec   (off-white page background)
   */

  /**
   * Confetti colors fired when an agent completes a step.
   * Should complement the brand palette.
   */
  confettiColors: ["#637777", "#a0c3d1", "#7c5a3e", "#ffffff"],
};
