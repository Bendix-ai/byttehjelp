import { useState, type ReactNode } from 'react';

export type AppSection = 'opprett' | 'spillere' | 'kamper' | 'planlegger' | 'kamp';

interface NavItem {
  id: AppSection;
  label: string;
  enabled: boolean;
}

interface Props {
  active: AppSection;
  items: NavItem[];
  teamName?: string;
  onSelect: (id: AppSection) => void;
  footer?: ReactNode;
}

export function Sidebar({ active, items, teamName, onSelect, footer }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = items.find(i => i.id === active)?.label ?? '';

  function handleSelect(id: AppSection) {
    onSelect(id);
    setMobileOpen(false);
  }

  const navContent = (
    <nav className="flex-1 p-2">
      {items.map((item, idx) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => item.enabled && handleSelect(item.id)}
            disabled={!item.enabled}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
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
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-200 flex-col print-hide">
        <div className="p-4 border-b border-gray-200">
          <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Byttehjelp</div>
          {teamName && <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{teamName}</div>}
        </div>
        {navContent}
        {footer && <div className="p-3 border-t border-gray-200">{footer}</div>}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 safe-area-top print-hide">
        <div className="flex items-center h-12 px-3">
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 active:bg-gray-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              )}
            </svg>
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-gray-900">{activeLabel}</span>
            {teamName && <span className="text-xs text-gray-400 ml-1.5">· {teamName}</span>}
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 print-hide" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Byttehjelp</div>
              {teamName && <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{teamName}</div>}
            </div>
            {navContent}
            {footer && <div className="p-3 border-t border-gray-200">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}
