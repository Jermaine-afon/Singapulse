import React from 'react';
import { Bookmark } from 'lucide-react';

export type AppTab = 'explore' | 'weather' | 'map' | 'planner';

const TABS: { id: AppTab; label: string; shortLabel?: string }[] = [
  { id: 'planner', label: 'Plan my day', shortLabel: 'Plan' },
  { id: 'explore', label: 'Discover' },
  { id: 'weather', label: 'Weather' },
  { id: 'map', label: 'Map' },
];

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  savedCount: number;
  onOpenItinerary: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, savedCount, onOpenItinerary }) => {
  const tabButton = (tab: (typeof TABS)[number], compact = false) => {
    const active = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => {
          setActiveTab(tab.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-current={active ? 'page' : undefined}
        className={`cursor-pointer rounded-full font-semibold transition-colors ${
          compact ? 'px-1 py-2 text-sm text-center' : 'shrink-0 px-4 py-2 text-[15px]'
        } ${
          active ? 'bg-primary text-ink-deep' : 'text-body hover:text-ink hover:bg-canvas-soft'
        }`}
      >
        {compact ? tab.shortLabel ?? tab.label : tab.label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-canvas border-b border-canvas-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('planner');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="display text-2xl text-ink flex items-center gap-1.5 shrink-0"
        >
          Singapulse
          <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-ink-deep/10" aria-hidden="true" />
        </a>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {TABS.map((tab) => tabButton(tab))}
        </nav>

        <button type="button" onClick={onOpenItinerary} className="btn btn-sm btn-secondary shrink-0">
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          My Trail
          <span className="nums min-w-6 rounded-full bg-canvas px-1.5 text-center text-xs font-semibold leading-5">
            {savedCount}
          </span>
        </button>
      </div>

      {/* Mobile: tabs as a scrollable row under the bar */}
      <nav className="md:hidden grid grid-cols-4 gap-1 px-3 pb-2 -mt-1" aria-label="Main">
        {TABS.map((tab) => tabButton(tab, true))}
      </nav>
    </header>
  );
};
