import { useEffect, useState, type MouseEvent } from 'react'
import { formatApkSize, type ReleaseInfo } from './release/release'
import './LandingPage.css'

export function LandingPage({
  fetcher = fetch,
  onOpenDemo,
}: {
  fetcher?: typeof fetch
  onOpenDemo?: () => void
}) {
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  const [releaseUnavailable, setReleaseUnavailable] = useState(false)

  useEffect(() => {
    let active = true
    void fetcher('/api/releases/latest')
      .then(async (response) => {
        if (!response.ok) throw new Error('release unavailable')
        return (await response.json()) as ReleaseInfo
      })
      .then((nextRelease) => {
        if (active) setRelease(nextRelease)
      })
      .catch(() => {
        if (active) setReleaseUnavailable(true)
      })
    return () => {
      active = false
    }
  }, [fetcher])

  const openDemo = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpenDemo) return
    event.preventDefault()
    onOpenDemo()
  }

  return (
    <main className="landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Smart Tag 首页">
          <span className="landing-brand-mark">F</span>
          <span>
            FRIDGE ELF
            <small>SMART TAG LIFE HELPER</small>
          </span>
        </a>
        <span className="landing-status">
          <i aria-hidden="true" />
          DEMO ONLINE
        </span>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker">YOUR FRIDGE, BUT SMARTER.</p>
          <h1>把冰箱里的食材，变成今天的一餐</h1>
          <p className="landing-lead">
            管理库存、发现快过期食材、规划采购，再把中文食谱变成四种可爱的步骤插画。
          </p>
          <div className="landing-actions">
            {release ? (
              <a
                className="landing-button landing-button-primary"
                href="/api/download/android"
                aria-label="下载 Android APK"
              >
                下载 Android APK
                <span>↓</span>
              </a>
            ) : (
              <span
                className="landing-button landing-button-disabled"
                aria-live="polite"
              >
                {releaseUnavailable ? 'APK 正在准备中' : '正在读取版本…'}
              </span>
            )}
            <a
              className="landing-button landing-button-secondary"
              href="/demo"
              aria-label="打开在线 Demo"
              onClick={openDemo}
            >
              打开在线 Demo
              <span>→</span>
            </a>
          </div>
        </div>

        <div className="landing-fridge-wrap" aria-hidden="true">
          <div className="landing-spark landing-spark-one">✦</div>
          <div className="landing-spark landing-spark-two">+</div>
          <div className="landing-fridge pixel-card">
            <div className="landing-fridge-screen">
              <span>GOOD DAY!</span>
              <strong>08:28</strong>
              <small>FRIDGE READY</small>
            </div>
            <div className="landing-fridge-line" />
            <div className="landing-fridge-handle" />
            <div className="landing-fridge-note">MILK · 2D</div>
          </div>
        </div>
      </section>

      <section className="landing-release pixel-card" aria-label="最新版本">
        <div>
          <span className="landing-section-label">LATEST RELEASE</span>
          <h2>{release?.tagName ?? '等待首个正式版本'}</h2>
        </div>
        {release ? (
          <dl className="landing-release-meta">
            <div>
              <dt>文件</dt>
              <dd>{release.apkName}</dd>
            </div>
            <div>
              <dt>大小</dt>
              <dd>{formatApkSize(release.apkSize)}</dd>
            </div>
            <div>
              <dt>系统</dt>
              <dd>Android 8.0+</dd>
            </div>
          </dl>
        ) : (
          <p className="landing-release-empty">
            APK 将随 GitHub 的 vX.Y.Z Release 自动出现在这里。
          </p>
        )}
      </section>

      <section className="landing-features">
        <article className="pixel-card">
          <span>01</span>
          <h3>冰箱库存</h3>
          <p>看见有什么，也看见什么该先吃。</p>
        </article>
        <article className="pixel-card">
          <span>02</span>
          <h3>菜谱规划</h3>
          <p>从现有食材出发，连接一周三餐与采购。</p>
        </article>
        <article className="pixel-card">
          <span>03</span>
          <h3>食谱插画</h3>
          <p>四种风格，共享准确、清楚的步骤结构。</p>
        </article>
      </section>

      <footer className="landing-footer">
        <span>SMART TAG · ADVX 2026</span>
        <span>ONE DOMAIN · ONE EXPERIENCE</span>
      </footer>
    </main>
  )
}
