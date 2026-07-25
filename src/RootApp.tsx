import { lazy, Suspense, useEffect, useState } from 'react'
import { createDemoRuntime } from './demo/demoRuntime'
import { LandingPage } from './LandingPage'

const DemoApp = lazy(() =>
  import('./App').then((module) => ({ default: module.App })),
)

function routeFor(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/demo' ? 'demo' : 'landing'
}

export function RootApp() {
  const [route, setRoute] = useState(() => routeFor(window.location.pathname))
  const [demoSession, setDemoSession] = useState(() => ({
    key: 0,
    runtime: createDemoRuntime(),
  }))

  useEffect(() => {
    const syncRoute = () => setRoute(routeFor(window.location.pathname))
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const openDemo = () => {
    window.history.pushState({}, '', '/demo')
    setRoute('demo')
  }

  if (route === 'demo') {
    return (
      <Suspense fallback={<div className="route-loading">正在打开 Demo…</div>}>
        <DemoApp
          key={demoSession.key}
          inventoryRuntime={demoSession.runtime}
          onRestartDemo={() =>
            setDemoSession((current) => ({
              key: current.key + 1,
              runtime: createDemoRuntime(),
            }))
          }
        />
      </Suspense>
    )
  }

  return <LandingPage onOpenDemo={openDemo} />
}
