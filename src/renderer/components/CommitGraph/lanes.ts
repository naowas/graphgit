/**
 * Layout constants and lane colours shared by the per-row lane renderer in
 * `CommitGraph.tsx` and the Mermaid gitGraph overlay in `MermaidGraph.tsx`.
 *
 * The Mermaid overlay is a single SVG for the whole list, so it can only line up
 * with the rows while every row starts its columns at the same x: the ref-pill
 * column is therefore a fixed width (`REFS_W`) instead of being sized by the
 * pills it happens to hold.
 */
export const LANE_W = 22;
export const ROW_H = 34;
/** Fixed width of the ref-pill column; keeps the graph column aligned in every row. */
export const REFS_W = 180;

export const LANE_COLORS = ['#4f8cff', '#9b7bff', '#4fc3f7', '#66bb6a', '#ffb74d', '#ef6c9a', '#26c6da', '#ab47bc', '#ff8a65', '#aed581'];

export function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}
