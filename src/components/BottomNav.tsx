import type { AppTab } from '../app/types'

const items: readonly { tab: AppTab; label: string }[] = [
  { tab: 'shop', label: '购物' },
  { tab: 'recipe', label: '食谱' },
  { tab: 'fridge', label: '冰箱' },
  { tab: 'note', label: '显示屏' },
  { tab: 'me', label: '我的' },
]

export function TabIcon({ tab }: { tab: AppTab }) {
  if (tab === 'shop') {
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M 4 4 L 6 4 L 8 18 L 20 18 L 22 8 L 8 8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="10" cy="21" r="1.5" fill="currentColor" />
        <circle cx="18" cy="21" r="1.5" fill="currentColor" />
      </svg>
    )
  }
  if (tab === 'recipe') {
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M 4 12 L 4 20 L 20 20 L 20 12" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="8" width="18" height="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="8" y="3" width="2" height="5" fill="currentColor" />
        <rect x="12" y="3" width="2" height="5" fill="currentColor" />
        <rect x="15" y="4" width="2" height="4" fill="currentColor" />
      </svg>
    )
  }
  if (tab === 'fridge') {
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="2.5" />
        <rect x="7" y="4" width="1.8" height="3" fill="currentColor" />
        <rect x="7" y="11" width="1.8" height="5" fill="currentColor" />
      </svg>
    )
  }
  if (tab === 'note') {
    return (
      <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="6" y="5" width="12" height="10" fill="currentColor" opacity="0.85" />
        <circle cx="12" cy="18" r="1" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 4 22 Q 12 14 20 22" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

interface BottomNavProps {
  currentTab: AppTab
  onSelectTab: (tab: AppTab) => void
}

export function BottomNav({ currentTab, onSelectTab }: BottomNavProps) {
  return (
    <nav className="nav-bar" data-tab={currentTab} aria-label="主导航">
      {items.map(({ tab, label }) => (
        <button
          key={tab}
          className={`nav-item${tab === 'fridge' ? ' hero' : ''}${currentTab === tab ? ' on' : ''}`}
          data-tab={tab}
          type="button"
          role="tab"
          aria-selected={currentTab === tab}
          onClick={() => onSelectTab(tab)}
        >
          <span className="nav-icon"><TabIcon tab={tab} /></span>
          <span className="nav-lbl">{label}</span>
        </button>
      ))}
    </nav>
  )
}
