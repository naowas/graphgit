import React, { useMemo, useState } from 'react';
import { Commit, CommitRef } from '../../../shared/types';
import { useApp, WIP_HASH } from '../../store';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu';
import { commitsToMermaidGitGraph } from './gitgraph';
import { LANE_W, REFS_W, ROW_H, laneColor } from './lanes';
import { GraphLayout, MermaidGraph } from './MermaidGraph';
import {
  GitBranch,
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  FolderPlus,
  RotateCcw,
  Pencil,
  Trash2,
  XCircle,
  ArrowDown,
  Sparkles,
  ArrowUp,
  Rocket
} from 'lucide-react';

const DOT_R = 5;

/** Stable empty list, so the conversion memo keys off the filtered commits only. */
const NO_COMMITS: Commit[] = [];

export function RefPill({ value: r, onContextMenu }: { value: CommitRef; onContextMenu?: (e: React.MouseEvent) => void }) {
  const cls = r.isCurrent
    ? 'bg-accent text-white border-accent'
    : r.kind === 'tag'
      ? 'bg-panel3 text-warn border-warn/40'
      : r.isRemote
        ? 'bg-panel3 text-dim border-edge'
        : 'bg-panel3 text-fg/90 border-edge';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] leading-4 font-medium whitespace-nowrap cursor-pointer ${cls}`}
      title={r.label}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e);
      }}
    >
      {r.kind === 'tag' ? 'tag: ' : ''}
      {r.label}
    </span>
  );
}

const WIP_COMMIT: Commit = {
  hash: WIP_HASH,
  shortHash: 'WIP',
  parents: [],
  message: 'Uncommitted changes',
  body: '',
  authorName: '',
  authorEmail: '',
  date: new Date().toISOString(),
  refs: [],
  lane: 0,
  lanes: []
};


function CommitRow({
  commit,
  isWip,
  graphW,
  drawLanes = true,
  hovered = false,
  childLane = -1,
  onContextMenu,
  onRefContextMenu
}: {
  commit: Commit;
  isWip?: boolean;
  graphW: number;
  /** false while the mermaid overlay draws the graph column for the whole list */
  drawLanes?: boolean;
  /** true while the pointer sits on this commit's node in the mermaid overlay */
  hovered?: boolean;
  /** lane of the commit directly above that arrives at this row */
  childLane?: number;
  onContextMenu?: (e: React.MouseEvent, commit: Commit) => void;
  onRefContextMenu?: (e: React.MouseEvent, ref: CommitRef) => void;
}) {
  const selected = useApp((s) => s.selectedCommit);
  const selectCommit = useApp((s) => s.selectCommit);
  const openFileDiff = useApp((s) => s.openFileDiff);
  const isSelected = selected === commit.hash;

  const x = (lane: number) => LANE_W / 2 + lane * LANE_W;
  const y = ROW_H / 2;

  const onDoubleClick = () => {
    if (isWip) {
      const st = useApp.getState().status;
      const first = [...(st?.staged || []), ...(st?.unstaged || [])][0];
      if (first) void openFileDiff({ commitHash: null, filePath: first.path });
    } else {
      void api.getCommitDetail(commit.hash).then((d) => {
        if (d && d.files[0]) void openFileDiff({ commitHash: commit.hash, filePath: d.files[0].path });
      });
    }
  };

  // Lanes that pass through this row without a node: full-height vertical lines
  // (own lane continues from parents, child's lane arrives from above).
  const ownLane = commit.parents.length > 1 ? -1 : commit.lane;
  const throughLines = Array.from(
    new Set([ownLane, childLane].filter((l): l is number => l >= 0 && l !== commit.lane))
  ).sort((a, b) => a - b);

  // Merge layout for genuine merge rows: first parent continues below in the
  // merge node's lane, extra parents get a return curve back into the node.
  const secondParentCurves: { key: number; lane: number; to: number; d: string }[] = [];
  const mergeBottom: { key: number; from: number; to: number }[] = [];
  const mergeRetLanes = new Set<number>();
  if (commit.parents.length > 1 && commit.pl2) {
    mergeRetLanes.add(commit.lane);
    for (const c of commit.pl2) {
      if (c.returnFrom === undefined) {
        // First parent: vertical column below the node in the merge lane.
        mergeBottom.push({ key: c.lane, from: commit.lane, to: c.lane ?? commit.lane });
      } else {
        // Extra parent: curve from its lane down into the merge node,
        // plus its own vertical column below.
        mergeRetLanes.add(c.lane);
        secondParentCurves.push({
          key: c.lane,
          lane: c.lane,
          to: commit.lane,
          d: ''
        });
        mergeBottom.push({ key: -c.lane - 1, from: c.lane, to: c.lane });
      }
    }
  } else if (commit.parents.length > 1) {
    const maxLane = Math.max(0, graphW / LANE_W - 1);
    for (let i = 1; i < commit.parents.length; i++) {
      const pLane = commit.lanes[i] ?? commit.lane;
      if (pLane === commit.lane) continue;
      const start = Math.max(0, Math.min(pLane, maxLane));
      secondParentCurves.push({
        key: i,
        lane: pLane,
        to: commit.lane,
        d: `M ${x(start)} 0 C ${x(start)} ${y * 0.7}, ${x(commit.lane)} ${y * 0.7}, ${x(commit.lane)} ${y}`
      });
    }
  }

  return (
    <div
      className={`flex items-stretch border-b border-edge/40 cursor-pointer ${
        isSelected ? 'bg-accent/10' : hovered ? 'bg-panel2/70' : 'hover:bg-panel2/60'
      }`}
      style={{ height: ROW_H }}
      onClick={() => void selectCommit(commit.hash)}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        if (!isWip && onContextMenu) {
          e.preventDefault();
          onContextMenu(e, commit);
        }
      }}
    >
      {/* Pills column: fixed width, so the graph column starts at the same x in every row */}
      <div className="flex items-center gap-1 pl-2 overflow-hidden shrink-0" style={{ width: REFS_W }}>
        {commit.refs.map((r, i) => (
          <RefPill key={i} value={r} onContextMenu={(e) => onRefContextMenu?.(e, r)} />
        ))}
      </div>

      {/* Graph column. The mermaid overlay draws the whole column at once, so the
          per-row lanes only fill the gap while no diagram is available. */}
      <div className="relative shrink-0" style={{ width: graphW }}>
        {drawLanes && (
          <svg width="100%" height={ROW_H} className="absolute inset-0">
            {throughLines
              .filter((lane) => !mergeRetLanes.has(lane))
              .map((lane) => (
                <line
                  key={lane}
                  x1={x(lane)}
                  y1={0}
                  x2={x(lane)}
                  y2={ROW_H}
                  stroke={laneColor(lane)}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
            {mergeBottom.map((s) => (
              <line
                key={'m' + s.key}
                x1={x(s.from)}
                y1={y}
                x2={x(s.to)}
                y2={ROW_H}
                stroke={laneColor(s.to)}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
            {commit.parents.length > 1 && !(commit.pl2 && commit.pl2.length > 0) && (
              <line
                x1={x(commit.lane)}
                y1={y}
                x2={x(commit.lanes[0] ?? commit.lane)}
                y2={y}
                stroke={laneColor(commit.lane)}
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            {secondParentCurves.map((c) => (
              <path
                key={'r' + c.key}
                d={c.d || `M ${x(c.lane)} 0 C ${x(c.lane)} ${y * 0.7}, ${x(c.to)} ${y * 0.7}, ${x(c.to)} ${y}`}
                stroke={laneColor(c.lane)}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
            ))}
            {commit.lanes.map((pl, i) => {
              if (pl === commit.lane) return null;
              // Skip segments already drawn by the merge-return layout above.
              if (commit.parents.length > 1 && commit.pl2) {
                if (i === 0) return null;
                if (commit.pl2.some((c) => c.returnFrom === pl)) return null;
              }
              return (
                <path
                  key={i}
                  d={`M ${x(commit.lane)} ${y} C ${x(commit.lane)} ${ROW_H * 0.75}, ${x(pl)} ${ROW_H * 0.25}, ${x(pl)} ${ROW_H}`}
                  stroke={laneColor(pl)}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })}
            {isWip ? (
              <circle cx={x(commit.lane)} cy={y} r={DOT_R + 1.5} fill="none" stroke="#d7a94f" strokeWidth={2.5} strokeDasharray="3 2" />
            ) : commit.parents.length > 1 ? (
              <g transform={`translate(${x(commit.lane)} ${y})`}>
                <circle cx={0} cy={0} r={DOT_R + 2.5} fill={laneColor(commit.lane)} />
                <circle cx={0} cy={0} r={DOT_R + 2.5} fill="none" stroke="#181a1f" strokeWidth={1} />
                <path
                  d="M -4.5 0.8 C -2.5 0.8, -2.5 -1.2, -0.5 -1.2 M -4.5 0.8 C -3.8 1.8, -2.2 2.2, -1.2 3 L -1.2 4.5 M 4.5 -0.8 C 2.5 -0.8, 2.5 1.2, 0.5 1.2 M 4.5 -0.8 C 3.8 -1.8, 2.2 -2.2, 1.2 -3 L 1.2 -4.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={0} cy={0} r={DOT_R + 2.5} fill="none" stroke="#181a1f" strokeWidth={1} opacity={0} />
              </g>
            ) : (
              <circle cx={x(commit.lane)} cy={y} r={DOT_R} fill="none" stroke={laneColor(commit.lane)} strokeWidth={2.5} />
            )}
          </svg>
        )}
      </div>

      {/* Message column */}
      <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
        {!isWip && <Avatar name={commit.authorName} email={commit.authorEmail} avatarHash={commit.avatarHash} size={20} />}
        {isWip ? (
          <span className="truncate text-warn font-medium">Uncommitted changes</span>
        ) : (
          <span className={`truncate ${isSelected ? 'text-fg font-medium' : 'text-fg/90'}`}>{commit.message || '(no message)'}</span>
        )}
        {commit.body && <span className="truncate text-dim text-xs hidden lg:block">{commit.body.split('\n')[0]}</span>}
        <span className="flex-1" />
        <span className="text-xs text-faint font-mono shrink-0">{commit.shortHash.slice(0, 7)}</span>
      </div>
    </div>
  );
}

export function CommitGraph() {
  const log = useApp((s) => s.log);
  const filter = useApp((s) => s.filter);
  const status = useApp((s) => s.status);
  const selectedCommit = useApp((s) => s.selectedCommit);
  const selectCommit = useApp((s) => s.selectCommit);
  const runAndRefresh = useApp((s) => s.runAndRefresh);
  const notify = useApp((s) => s.notify);
  const [menu, setMenu] = useState<{ x: number; y: number; commit: Commit } | null>(null);
  const [refMenu, setRefMenu] = useState<{ x: number; y: number; ref: CommitRef } | null>(null);
  /** alignment reported by the mermaid overlay; null while it has no diagram */
  const [layout, setLayout] = useState<GraphLayout | null>(null);
  /** commit row the pointer sits on in the diagram, so the list can highlight it */
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);

  const q = filter.trim().toLowerCase();
  const allCommits = log?.commits;
  const commits = useMemo(() => {
    if (!allCommits) return NO_COMMITS;
    if (!q) return allCommits;
    return allCommits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.hash.startsWith(q) ||
        c.authorName.toLowerCase().includes(q) ||
        c.refs.some((r) => r.label.toLowerCase().includes(q))
    );
  }, [allCommits, q]);
  const currentBranch = status?.currentBranch ?? '';
  const conversion = useMemo(() => commitsToMermaidGitGraph(commits, { currentBranch }), [commits, currentBranch]);

  if (!log) {
    return <div className="flex-1 flex items-center justify-center text-dim text-sm">Open a repository to view the commit graph</div>;
  }

  const wip = status && (status.staged.length > 0 || status.unstaged.length > 0);
  // The overlay scales mermaid's lanes into the column width it reports; without
  // a diagram the column is sized from the precomputed lane columns instead.
  const maxLane = commits.reduce((m, c) => Math.max(m, c.lane, ...c.lanes), 0);
  const lanesW = Math.max(LANE_W * (maxLane + 1) + LANE_W / 2, 60);
  const diagram = !!layout && layout.width > 0;
  const graphW = diagram && layout ? layout.width : lanesW;
  /** y of the first commit row below the optional WIP row */
  const rowTop = wip ? ROW_H : 0;

  const previewStub = (feature: string) => notify('info', `${feature} is a preview feature — coming soon`);

  const refMenuItems = (ref: CommitRef): ContextMenuItem[] => {
    const name = ref.label;
    const isLocal = !ref.isRemote && ref.kind !== 'tag';
    const remoteName = ref.isRemote ? name.split('/')[0] : 'origin';
    const remoteShort = ref.isRemote ? name.split('/').slice(1).join('/') : name;
    return [
      ...(isLocal
        ? ([
            {
              label: `Checkout ${name}`,
              icon: <GitBranch size={13} />,
              onClick: () => void runAndRefresh(() => api.checkoutBranch(name), `Checked out ${name}`)
            },
            {
              label: `Push ${name} to origin`,
              icon: <ArrowUpFromLine size={13} />,
              onClick: () => void runAndRefresh(() => api.pushSetUpstream(name), `Pushed ${name}`)
            },
            {
              label: 'Set Upstream…',
              icon: <ArrowUp size={13} />,
              prompt: {
                placeholder: `Upstream (e.g. origin/${name})`,
                submitLabel: 'Set upstream',
                onSubmit: (u) => void runAndRefresh(() => api.setUpstream(name, u), `Upstream of ${name} set to ${u}`)
              }
            },
            { label: '', divider: true },
            {
              label: `Delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () => void runAndRefresh(() => api.deleteBranch(name, { local: true }), `Deleted ${name}`)
            },
            {
              label: `Force delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () =>
                void runAndRefresh(() => api.deleteBranch(name, { local: true, force: true }), `Force deleted ${name}`)
            }
          ] as ContextMenuItem[])
        : [
            {
              label: `Delete ${name}`,
              icon: <Trash2 size={13} />,
              danger: true,
              onClick: () =>
                void runAndRefresh(
                  () => api.deleteBranch(remoteShort, { local: false, remote: true, force: true }),
                  `Deleted ${name}`
                )
            }
          ]),
      {
        label: `Delete ${name} and ${remoteName}/${remoteShort}`,
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () =>
          void runAndRefresh(
            () => api.deleteBranch(remoteShort, { local: true, remote: true, force: true }),
            `Deleted ${name} and ${remoteName}/${remoteShort}`
          )
      }
    ];
  };

  const commitMenuItems = (commit: Commit): ContextMenuItem[] => [
    {
      label: 'Pull (fast-forward if possible)',
      icon: <ArrowDownToLine size={13} />,
      onClick: () => void runAndRefresh(() => api.pull(), 'Pull complete')
    },
    {
      label: 'Push',
      icon: <ArrowUpFromLine size={13} />,
      onClick: () => void runAndRefresh(() => api.push(), 'Push complete')
    },
    { label: '', divider: true },
    {
      label: 'Checkout',
      icon: <GitBranch size={13} />,
      onClick: () =>
        void runAndRefresh(() => api.checkoutCommit(commit.hash), `Checked out ${commit.shortHash} (detached HEAD)`)
    },
    {
      label: 'Create worktree from',
      icon: <FolderPlus size={13} />,
      prompt: {
        placeholder: 'Worktree path (e.g. ../wt-feature)',
        submitLabel: 'Create worktree',
        onSubmit: (p) => void runAndRefresh(() => api.createWorktree(commit.hash, p), `Worktree created at ${p}`)
      }
    },
    {
      label: 'Create branch here',
      icon: <GitBranch size={13} />,
      prompt: {
        placeholder: 'Branch name',
        submitLabel: 'Create branch',
        onSubmit: (name) => void runAndRefresh(() => api.createBranch(name, commit.hash), `Branch '${name}' created`)
      }
    },
    { label: '', divider: true },
    ...(currentBranch
      ? ([
          {
            label: `Reset ${currentBranch} to this commit (hard)`,
            icon: <RotateCcw size={13} />,
            danger: true,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'hard'), `Reset ${currentBranch} (hard)`)
          },
          {
            label: `Reset ${currentBranch} to this commit (soft)`,
            icon: <RotateCcw size={13} />,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'soft'), `Reset ${currentBranch} (soft)`)
          },
          {
            label: `Reset ${currentBranch} to this commit (mixed)`,
            icon: <RotateCcw size={13} />,
            onClick: () => void runAndRefresh(() => api.resetBranchTo(commit.hash, 'mixed'), `Reset ${currentBranch} (mixed)`)
          },
          { label: '', divider: true }
        ] as ContextMenuItem[])
      : []),
    {
      label: 'Edit commit message',
      icon: <Pencil size={13} />,
      prompt: {
        placeholder: 'New commit message',
        initial: commit.message,
        submitLabel: 'Reword commit',
        onSubmit: (m) => void runAndRefresh(() => api.editCommitMessage(commit.hash, m), 'Commit message updated')
      }
    },
    {
      label: 'Revert commit',
      icon: <XCircle size={13} />,
      onClick: () => void runAndRefresh(() => api.revertCommit(commit.hash), `Reverted ${commit.shortHash}`)
    },
    {
      label: 'Recompose commit with AI (Preview)',
      icon: <Sparkles size={13} />,
      onClick: () => previewStub('Recompose commit with AI')
    },
    {
      label: 'Drop commit',
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: () => void runAndRefresh(() => api.dropCommit(commit.hash), `Dropped ${commit.shortHash}`)
    },
    {
      label: 'Move commit down',
      icon: <ArrowDown size={13} />,
      onClick: () => void runAndRefresh(() => api.moveCommitDown(commit.hash), `Moved ${commit.shortHash} down`)
    },
    { label: '', divider: true },
    {
      label: 'Start a pull request to origin',
      icon: <GitPullRequest size={13} />,
      onClick: () => previewStub('Start a pull request')
    },
    {
      label: 'Explain Branch Changes (Preview)',
      icon: <Rocket size={13} />,
      onClick: () => previewStub('Explain Branch Changes')
    },
    {
      label: 'Apply patch to current branch',
      icon: <ArrowUp size={13} />,
      onClick: () => void runAndRefresh(() => api.applyPatchCommit(commit.hash), `Applied patch of ${commit.shortHash}`)
    }
  ];


  return (
    <div className="flex-1 overflow-auto min-h-0 bg-base">
      <div className="sticky top-0 z-10 flex items-stretch bg-panel border-b border-edge text-xs text-dim">
        <div className="pl-2 py-1.5" style={{ width: REFS_W }}>
          Branch / Tag
        </div>
        <div className="py-1.5 flex items-center gap-1.5" style={{ width: graphW }}>
          <span>Graph</span>
          {conversion.reasons.length > 0 && (
            <span className="cursor-help text-warn" title={conversion.reasons.join('\n')}>
              *
            </span>
          )}
        </div>
        <div className="py-1.5 flex-1">Committer / Message</div>
      </div>
      {/* The rows scrolling under the overlay: `id` is the CSS scope for the diagram */}
      <div id="gg-rows" className="relative">
        {wip && (
          <CommitRow commit={WIP_COMMIT} isWip graphW={graphW} drawLanes={!diagram} childLane={commits[0]?.lane ?? -1} />
        )}
        {commits.map((c, i) => (
          <CommitRow
            key={c.hash + i}
            commit={c}
            graphW={graphW}
            drawLanes={!diagram}
            hovered={hoveredHash === c.hash}
            childLane={i === 0 ? (wip ? 0 : -1) : commits[i - 1].lane}
            onContextMenu={(e, commit) => {
              void selectCommit(commit.hash);
              setRefMenu(null);
              setMenu({ x: e.clientX, y: e.clientY, commit });
            }}
            onRefContextMenu={(e, ref) => {
              setMenu(null);
              setRefMenu({ x: e.clientX, y: e.clientY, ref });
            }}
          />
        ))}
        <MermaidGraph
          source={conversion.source}
          mainBranch={conversion.mainBranch}
          commits={commits}
          rowTop={rowTop}
          left={REFS_W}
          width={graphW}
          visible={diagram}
          notes={conversion.reasons}
          selectedHash={selectedCommit}
          hoveredHash={hoveredHash}
          onLayout={setLayout}
          onHover={(commit) => setHoveredHash(commit ? commit.hash : null)}
          onSelect={(commit) => void selectCommit(commit.hash)}
          onContextMenu={(e, commit) => {
            void selectCommit(commit.hash);
            setRefMenu(null);
            setMenu({ x: e.clientX, y: e.clientY, commit });
          }}
        />
        {diagram && wip && layout && (
          <span className="gg-wip-marker" style={{ left: REFS_W + layout.firstNodeX, top: ROW_H / 2 }} />
        )}
      </div>
      {commits.length === 0 && !wip && <div className="p-6 text-sm text-faint">No commits match the current filter.</div>}
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={commitMenuItems(menu.commit)} onClose={() => setMenu(null)} />
      )}
      {refMenu && (
        <ContextMenu x={refMenu.x} y={refMenu.y} items={refMenuItems(refMenu.ref)} onClose={() => setRefMenu(null)} />
      )}
    </div>
  );
}

