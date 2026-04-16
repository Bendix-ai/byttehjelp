import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { Formation, Period } from '../types';
import { layoutPositions } from '../utils/pitch';

interface Props {
  formation: Formation;
  period: Period;
  prevPeriod?: Period | null;
  nextPeriod?: Period | null;
  playerMap: Map<string, string>;
  keeperLockedFromPrev: boolean;
  interactive: boolean;
  onCellClick: (position: string) => void;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function PositionSlot({ pos, pid, name, isKeeper, isLockedKeeper, isIncoming, isOutgoing, interactive, onCellClick }: {
  pos: string; pid: string; name: string;
  isKeeper: boolean; isLockedKeeper: boolean;
  isIncoming: boolean; isOutgoing: boolean;
  interactive: boolean;
  onCellClick: (pos: string) => void;
}) {
  const canInteract = interactive && !isLockedKeeper;

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `pos:${pos}`,
    data: { position: pos },
    disabled: !canInteract,
  });

  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: `field:${pos}`,
    data: { playerId: pid, fromPosition: pos },
    disabled: !pid || !canInteract,
  });

  const ringCls = isOver
    ? 'ring-2 ring-dashed ring-[var(--color-primary)]'
    : isDragging
      ? 'ring-2 ring-[var(--color-primary)] shadow-lg scale-110'
      : isOutgoing
        ? 'ring-2 ring-[var(--color-sub-out-ink)]'
        : isIncoming
          ? 'ring-2 ring-[var(--color-sub-in-ink)]'
          : isKeeper
            ? 'ring-2 ring-[var(--color-keeper-ink)]'
            : '';

  const bgCls = !pid
    ? `bg-white/70 border border-dashed ${isOver ? 'border-[var(--color-primary)]' : 'border-gray-400'} text-gray-400`
    : isOutgoing
      ? 'bg-[var(--color-sub-out)] text-[var(--color-sub-out-ink)]'
      : isIncoming
        ? 'bg-[var(--color-sub-in)] text-[var(--color-sub-in-ink)]'
        : isKeeper
          ? 'bg-[var(--color-keeper)] text-[var(--color-keeper-ink)]'
          : 'bg-white text-gray-900';

  return (
    <div
      ref={(node) => { setDropRef(node); setDragRef(node); }}
      {...attributes}
      {...listeners}
      onClick={() => canInteract && onCellClick(pos)}
      className={`absolute flex flex-col items-center gap-0.5 ${canInteract ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}>
      <div className={`rounded-full shadow-sm w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xs font-bold transition-all ${bgCls} ${ringCls}`}>
        {pid ? initials(name) : '+'}
      </div>
      <div className="text-[10px] font-semibold text-gray-700 bg-white/90 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap max-w-[120px] truncate">
        {pid ? name : pos}
      </div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wide">{pos}</div>
    </div>
  );
}

export function FieldPitch({ formation, period, prevPeriod, nextPeriod, playerMap, keeperLockedFromPrev, interactive, onCellClick }: Props) {
  const layout = layoutPositions(formation);
  const keeperPos = formation.positions[0];

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden" style={{ aspectRatio: '100 / 110' }}>
      <svg viewBox="0 0 100 110" className="absolute inset-0 w-full h-full">
        <rect x="0" y="0" width="100" height="110" fill="#e8f4ea" />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x="0" y={i * 18.33} width="100" height="18.33" fill={i % 2 ? '#ddedde' : '#e8f4ea'} />
        ))}
        <rect x="2" y="2" width="96" height="106" fill="none" stroke="#ffffff" strokeWidth="0.6" />
        <line x1="2" y1="55" x2="98" y2="55" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="55" r="9" fill="none" stroke="#ffffff" strokeWidth="0.4" />
        <circle cx="50" cy="55" r="0.8" fill="#ffffff" />
        <rect x="25" y="92" width="50" height="16" fill="none" stroke="#ffffff" strokeWidth="0.4" />
        <rect x="38" y="102" width="24" height="6" fill="none" stroke="#ffffff" strokeWidth="0.4" />
        <rect x="25" y="2" width="50" height="16" fill="none" stroke="#ffffff" strokeWidth="0.4" />
        <rect x="38" y="2" width="24" height="6" fill="none" stroke="#ffffff" strokeWidth="0.4" />
      </svg>

      {formation.positions.map(pos => {
        const coord = layout[pos] ?? { x: 50, y: 55 };
        const pid = period.positions[pos] ?? '';
        const name = pid ? playerMap.get(pid) ?? '?' : '';

        const prevPid = prevPeriod?.positions[pos];
        const nextPid = nextPeriod?.positions[pos];
        const isIncoming = !!pid && !!prevPid && prevPid !== pid;
        const isOutgoing = !!pid && !!nextPid && nextPid !== pid && !isIncoming;
        const isKeeper = pos === keeperPos;
        const isLockedKeeper = isKeeper && keeperLockedFromPrev;

        return (
          <div key={pos} className="absolute" style={{
            left: `${coord.x}%`,
            top: `${(coord.y / 110) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <PositionSlot
              pos={pos} pid={pid} name={name}
              isKeeper={isKeeper} isLockedKeeper={isLockedKeeper}
              isIncoming={isIncoming} isOutgoing={isOutgoing}
              interactive={interactive}
              onCellClick={onCellClick}
            />
          </div>
        );
      })}
    </div>
  );
}
