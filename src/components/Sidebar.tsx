import type { ReactNode } from 'react';

export type AppSection = 'opprett' | 'spillere' | 'kamper' | 'planlegger' | 'kamp';

interface NavItem {
  id: AppSection;
  label: string;
  enabled: boolean;
  hint?: string;
}

interface Props {
  active: AppSection;
  items: NavItem[];
  teamName?: string;
  onSelect: (id: AppSection) => void;
  footer?: ReactNode;
}

export function Sidebar({ active, items, teamName, onSelect, footer }: Props) {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col print-hide">
      <div className="p-4 border-b border-gray-200">
        <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Byttehjelp</div>
        {teamName && <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{teamName}</div>}
      </div>
      <nav className="flex-1 p-2">
        {items.map((item, idx) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => item.enabled && onSelect(item.id)}
              disabled={!item.enabled}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  : item.enabled
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed'
              }`}>
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {idx + 1}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      {footer && <div className="p-3 border-t border-gray-200">{footer}</div>}
    </aside>
  );
}
