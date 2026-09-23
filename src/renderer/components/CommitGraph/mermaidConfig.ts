/**
 * Mermaid `gitGraph` init config for the commit graph column.
 *
 * Kept in its own (JSX-free) module so the headless checks in `scripts/` can
 * render with exactly the settings the app ships.
 */
import { LANE_COLORS } from './lanes';

/** Palette entry N paints branch N and its commits; see mermaid's gitGraph styles. */
function laneThemeVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  LANE_COLORS.forEach((color, i) => {
    vars[`git${i}`] = color;
    // the bullet's inner dot and the merge/return dots use the inverse colour
    vars[`gitInv${i}`] = color;
    vars[`gitBranchLabel${i}`] = color;
  });
  return vars;
}

/**
 * `BT` + one commit per row is what lets the SVG line up with the commit list:
 * mermaid draws the oldest statement first at the bottom, so ascending `y` in
 * the rendered SVG is exactly the newest-first row order of the list.
 */
export function buildGitGraphConfig(mainBranch: string): Record<string, unknown> {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      // commit messages live in the list column, not in the diagram
      commitLabelColor: '#c7cbd4',
      commitLabelBackground: 'transparent',
      commitLabelFontSize: '11px',
      tagLabelColor: '#e6e8ee',
      tagLabelBackground: '#2b2e35',
      tagLabelBorder: '#4a4e59',
      tagLabelFontSize: '10px',
      ...laneThemeVariables()
    },
    gitGraph: {
      // the trunk of the loaded history takes the place of mermaid's own branch
      mainBranchName: mainBranch,
      showCommitLabel: false,
      showBranches: true,
      rotateCommitLabel: false,
      parallelCommits: false,
      // fixed px sizing: the overlay scales the SVG itself, so it must not be
      // stretched to its container's width
      useMaxWidth: false
    }
  };
}
