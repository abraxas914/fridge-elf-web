import type { AppTab } from '../app/types'
import { PixelIcon } from '../catalog/pixelIcons'
import { TabIcon } from './BottomNav'

const labels: Record<AppTab, string> = {
  shop: '购物',
  recipe: '食谱',
  fridge: '冰箱',
  note: '显示屏',
  me: '我的',
}

interface AppHeaderProps {
  currentTab: AppTab
  muted: boolean
  connected: boolean
  runtimeLabel?: string
  onToggleMute: () => void
  onOpenPeek: () => void
}

export function AppHeader({
  currentTab,
  muted,
  connected,
  runtimeLabel,
  onToggleMute,
  onOpenPeek,
}: AppHeaderProps) {
  const compact = currentTab !== 'fridge'
  return (
    <header
      className={`app-header${compact ? ' compact' : ''}`}
      data-tab={currentTab}
    >
      <div className="compact-tab-chip">
        <div className="compact-tab-icon"><TabIcon tab={currentTab} /></div>
        <div className="compact-tab-label">{labels[currentTab]}</div>
      </div>
      <div className="app-logo-big">
        <svg viewBox="0 0 24 30" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="3" y="1" width="18" height="28" fill="#F5EAC8" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="3" y="1" width="18" height="2" fill="#D9CFB0" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="4.5" y="4" width="1.5" height="5" fill="#8A7455" />
          <rect x="4.5" y="14" width="1.5" height="8" fill="#8A7455" />
          <rect x="13" y="4" width="6" height="4" fill="#3a3a2e" />
          <rect x="14" y="5" width="4" height="1" fill="#A8C08A" />
          <rect x="14" y="6.5" width="3" height="0.7" fill="#E8B84A" />
          <polygon points="10,15 11,17 13,17 11.5,18.5 12,20 10,19 8,20 8.5,18.5 7,17 9,17" fill="#E8B84A" stroke="#2B2117" strokeWidth="0.6" />
          <path d="M 15 17 C 14 16 13 17 13 18 C 13 19.5 15 20.5 15 20.5 C 15 20.5 17 19.5 17 18 C 17 17 16 16 15 17 Z" fill="#D96B4F" stroke="#2B2117" strokeWidth="0.6" />
          <rect x="5" y="29" width="3" height="1" fill="#5A4530" />
          <rect x="16" y="29" width="3" height="1" fill="#5A4530" />
        </svg>
      </div>
      <div className="app-title-block">
        <div className="app-title">生活搭把手</div>
        <div className="app-title-sub">LIFE HELPER KIT · V0.3</div>
        <button className="realtime-btn" type="button" onClick={onOpenPeek}>
          <svg viewBox="0 0 20 16" width="20" height="16" shapeRendering="crispEdges" aria-hidden="true">
            <rect x="1" y="4" width="12" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="13,6 19,3 19,15 13,12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="7" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="9" r="1" fill="currentColor" />
            <circle cx="3.5" cy="6.5" r="0.7" fill="#D96B4F" />
          </svg>
          <span className="rt-txt">
            实时查看<span className="rt-sub">查看冰箱内实时画面</span>
          </span>
        </button>
      </div>
      <div className="header-right">
        <button
          className={`mute-btn${muted ? ' muted' : ''}`}
          type="button"
          aria-label={muted ? '开启声音' : '静音'}
          onClick={onToggleMute}
        >
          <PixelIcon name={muted ? 'sound-off' : 'sound'} className="pxi" />
        </button>
        <div className="status-stack">
          <div className={`app-status${connected ? '' : ' offline'}`}>
            <span className="status-dot" />
            <span className="status-txt">{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <div className="signal-indicator" title="连接信号" aria-label={connected ? '已连接' : '未连接'}>
            <span className="s-bar" /><span className="s-bar" /><span className="s-bar" /><span className="s-bar" />
          </div>
          {runtimeLabel ? (
            <div className="runtime-label">{runtimeLabel}</div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
