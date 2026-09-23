/**
 * Geometry that maps a rendered Mermaid `gitGraph BT` SVG onto the commit list.
 *
 * The converter emits commits oldest-first and the diagram is drawn bottom-to-top,
 * so in the rendered SVG the newest commit has the smallest `y`: node `k` of the
 * measured boxes in ascending `cy` order belongs to row `k` of the (newest-first)
 * list. Scaling the whole diagram by `rowH / step` and translating it puts every
 * node on its row's centre line, so one scaled SVG replaces the per-row lane
 * drawing and stays aligned while the list scrolls.
 */

/** A rendered node as measured in the graph host, in host-relative CSS pixels. */
export interface NodeBox {
  /** node centre */
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface AlignOptions {
  /** y of the first commit row inside the overlay host (below an optional WIP row) */
  rowTop: number;
  /** list row height */
  rowH: number;
  /** number of commit rows the diagram has to line up with */
  rowCount: number;
  /** free space kept left and right of the diagram */
  pad?: number;
  minWidth?: number;
}

export interface GraphAlignment {
  /** scale that turns the diagram's row step into `rowH` */
  scale: number;
  /** translation applied after scaling (transform origin `0 0`) */
  tx: number;
  ty: number;
  /** width the graph column needs in CSS pixels */
  width: number;
}

/** Narrowest sensible graph column; below this the lanes are unreadable. */
export const GRAPH_MIN_W = 56;

/**
 * Fit measured diagram nodes onto the list rows. Returns `null` when there is
 * nothing to align (no nodes, no rows), which tells the caller to fall back to
 * the per-row lane renderer.
 */
export function alignGraphRows(nodes: NodeBox[], opts: AlignOptions): GraphAlignment | null {
  const { rowTop, rowH, rowCount, pad = 4, minWidth = GRAPH_MIN_W } = opts;
  if (nodes.length === 0 || rowCount <= 0 || rowH <= 0) return null;

  const sorted = [...nodes].sort((a, b) => a.cy - b.cy);
  const step = medianStep(sorted);
  const scale = step > 0 ? rowH / step : 1;
  const left = Math.min(...sorted.map((n) => n.cx - n.width / 2));
  const right = Math.max(...sorted.map((n) => n.cx + n.width / 2));
  const tx = pad - scale * left;
  const ty = rowTop + rowH / 2 - scale * sorted[0].cy;
  return { scale, tx, ty, width: Math.max(minWidth, tx + scale * right + pad) };
}

/**
 * Row step of a rendered diagram: the median gap between neighbouring nodes.
 * The median ignores the wider gap a skipped commit leaves behind (and the
 * branch-label band at the bottom), which a simple mean would drag out of line.
 */
function medianStep(sorted: NodeBox[]): number {
  if (sorted.length < 2) return 0;
  const steps: number[] = [];
  for (let i = 1; i < sorted.length; i++) steps.push(sorted[i].cy - sorted[i - 1].cy);
  steps.sort((a, b) => a - b);
  return steps[steps.length >> 1];
}
