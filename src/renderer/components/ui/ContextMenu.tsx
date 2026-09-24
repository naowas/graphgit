import React, { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  /** Renders an inline text input (e.g. "branch name") instead of a button */
  prompt?: {
    placeholder: string;
    initial?: string;
    submitLabel: string;
    onSubmit: (value: string) => void;
  };
}

export function ContextMenu({
  x,
  y,
  items,
  onClose
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Keep the menu inside the viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - Math.min(items.length * 30 + 20, window.innerHeight - 10)),
    zIndex: 1000
  };

  return (
    <div ref={ref} style={style} className="w-60 rounded-md border border-edge bg-panel2 shadow-xl py-1 text-xs select-none">
      {items.map((item, i) => {
        if (item.divider) return <div key={i} className="my-1 border-t border-edge" />;
        if (item.prompt) {
          return (
            <ContextMenuPrompt
              key={i}
              prompt={item.prompt}
              onClose={onClose}
            />
          );
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
              item.disabled ? 'opacity-40 cursor-default' : 'hover:bg-accent/20'
            } ${item.danger ? 'text-del' : 'text-fg/90'}`}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
          >
            {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ContextMenuPrompt({
  prompt,
  onClose
}: {
  prompt: NonNullable<ContextMenuItem['prompt']>;
  onClose: () => void;
}) {
  const [val, setVal] = useState(prompt.initial ?? '');

  return (
    <div className="px-2 py-1.5 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) {
            prompt.onSubmit(val.trim());
            onClose();
          }
        }}
        placeholder={prompt.placeholder}
        className="w-full text-xs px-2 py-1 bg-base border border-edge rounded"
      />
      <button
        className="rounded bg-accent hover:bg-accent-hover text-white px-2 py-1 font-medium disabled:opacity-40"
        disabled={!val.trim()}
        onClick={() => {
          if (val.trim()) {
            prompt.onSubmit(val.trim());
            onClose();
          }
        }}
      >
        {prompt.submitLabel}
      </button>
    </div>
  );
}
