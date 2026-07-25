import { useEffect, useRef, type ReactNode } from 'react'
import type { AppTab } from '../app/types'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'
import { Modal } from './Modal'
import { Toast } from './Toast'
import './AppShell.css'

interface ShellModal {
  title: string
  content: ReactNode
}

interface AppShellProps {
  currentTab: AppTab
  muted: boolean
  connected: boolean
  runtimeLabel?: string
  toast: string | null
  modal: ShellModal | null
  children: ReactNode
  onSelectTab: (tab: AppTab) => void
  onToggleMute: () => void
  onOpenPeek: () => void
  onCloseModal: () => void
}

export function AppShell({
  currentTab,
  muted,
  connected,
  runtimeLabel,
  toast,
  modal,
  children,
  onSelectTab,
  onToggleMute,
  onOpenPeek,
  onCloseModal,
}: AppShellProps) {
  const bodyRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [currentTab])

  return (
    <section id="app-scene" className="scene active">
      <AppHeader
        currentTab={currentTab}
        muted={muted}
        connected={connected}
        runtimeLabel={runtimeLabel}
        onToggleMute={onToggleMute}
        onOpenPeek={onOpenPeek}
      />
      <main className="app-body" ref={bodyRef}>{children}</main>
      <BottomNav currentTab={currentTab} onSelectTab={onSelectTab} />
      <Toast message={toast} />
      <Modal
        open={modal !== null}
        title={modal?.title ?? 'INFO'}
        onClose={onCloseModal}
      >
        {modal?.content}
      </Modal>
    </section>
  )
}
