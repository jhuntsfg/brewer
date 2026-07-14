/**
 * AGENCY CONFIG — edit this file when deploying for a new agency.
 * All agency-specific branding and identity lives here.
 */
export const AGENCY = {
  /** Display name used throughout the UI */
  name: "Brewer Agency",

  /**
   * Brand colors — also update app/globals.css @theme block to match.
   * These are kept here for reference; Tailwind reads them from CSS.
   *
   * primary:       #1b3a5c   (navy — headers, checkboxes, buttons)
   * primaryLight:  #dce8f2   (pale navy-blue — checked backgrounds)
   * primaryDark:   #0f2740   (darker navy — hover states)
   * warm:          #4b9cd3   (carolina blue — admin accents)
   * warmLight:     #eaf4fb   (pale carolina blue — admin backgrounds)
   * sky:           #7ec8e3   (light carolina blue — confetti accent)
   * background:    #ffffff   (white page background)
   */

  /**
   * Confetti colors fired when an agent completes a step.
   * Should complement the brand palette.
   */
  confettiColors: ["#1b3a5c", "#4b9cd3", "#7ec8e3", "#ffffff"],
};
