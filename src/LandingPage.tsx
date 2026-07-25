import { useEffect, useState, type MouseEvent } from 'react'
import { LandingSection } from './landing/LandingSection'
import { FridgeHeroSvg } from './landing/illustrations/FridgeHeroSvg'
import { FridgeShelfSvg } from './landing/illustrations/FridgeShelfSvg'
import { formatApkSize, type ReleaseInfo } from './release/release'
import './LandingPage.css'

const navigation = [
  ['lifecycle', '食材的一生'],
  ['iot', '家庭 IoT'],
  ['multimodal', '多模态'],
  ['why', '为什么'],
  ['experience', '体验'],
] as const

const lifecycleSteps = [
  ['01', '买回家', '新食材进入家庭'],
  ['02', '被记录', '语音、视觉、触摸或手机录入'],
  ['03', '被照看', '批次、余量与保质期持续更新'],
  ['04', '变成一餐', 'AI 根据库存提供菜谱与三餐建议'],
  ['05', '缺货采购', '缺少的材料进入采购清单'],
  ['06', '再次入库', '购买完成后回到下一轮库存'],
] as const

const capabilities = [
  {
    number: '01',
    title: '知道冰箱里有什么',
    body: '说一句、点一下，或者让摄像头看一眼，食材就被记住了。不同批次分别保存，取出两个鸡蛋也能准确更新余量。',
  },
  {
    number: '02',
    title: '该先吃的，及时出现',
    body: '临期食材会被优先提醒。想不到今天吃什么时，AI 会从现有库存出发给出菜谱，并把缺少的材料放进采购清单。',
  },
  {
    number: '03',
    title: '冰箱也可以成为家里的留言处',
    body: '便签、三餐、日历和食物清单都能留在冰箱屏幕上。它既照看食材，也接住家人在厨房里需要看见的信息。',
  },
] as const

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

  const demoLink = (
    <a
      className="landing-button landing-button-primary"
      href="/demo"
      aria-label="打开在线 Demo"
      onClick={openDemo}
    >
      打开在线 Demo
      <span aria-hidden="true">→</span>
    </a>
  )

  const apkLink = release ? (
    <a
      className="landing-button landing-button-secondary"
      href="/api/download/android"
      aria-label="下载 Android APK"
    >
      下载 Android APK
      <span aria-hidden="true">↓</span>
    </a>
  ) : (
    <span className="landing-button landing-button-disabled" aria-live="polite">
      {releaseUnavailable ? 'APK 正在准备中' : '正在读取版本…'}
    </span>
  )

  return (
    <main className="landing-page">
      <div className="landing-noise" aria-hidden="true" />

      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="冰箱精灵首页">
          <span className="landing-brand-mark">F</span>
          <span>
            FRIDGE ELF
            <small>EVERYDAY THINGS · QUIETLY REMEMBERED</small>
          </span>
        </a>
        <nav className="landing-header-nav" aria-label="产品介绍章节">
          {navigation.map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <span className="landing-status">
          <i aria-hidden="true" />
          DEMO ONLINE
        </span>
      </header>

      <nav className="landing-progress" aria-label="页面章节">
        {navigation.map(([id, label], index) => (
          <a href={`#${id}`} aria-label={label} key={id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
          </a>
        ))}
      </nav>

      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-copy">
          <p className="landing-kicker">
            FROM FRIDGE TO TABLE, AND BACK AGAIN
          </p>
          <h1 id="landing-hero-title">
            让冰箱里的每一份食材，都有始有终。
          </h1>
          <p className="landing-lead">
            一盒牛奶什么时候买的，鸡蛋还剩几个，哪些菜应该先吃，不必再靠谁一直记着。冰箱精灵留在冰箱旁，也跟着家人到了手机上，陪食材从录入、提醒、做饭走到下一次采购。
          </p>
          <div className="landing-actions">
            {demoLink}
            {apkLink}
          </div>
          <p className="landing-assurance">
            语音、视觉、触摸与手机同步。视觉识别仍在持续完善。
          </p>
        </div>
        <div className="landing-hero-visual">
          <FridgeHeroSvg />
        </div>
      </section>

      <LandingSection
        className="landing-problem"
        labelledBy="problem-title"
      >
        <div className="landing-section-copy">
          <p className="landing-kicker">一些很普通、也很常见的时刻</p>
          <h2 id="problem-title">
            有些食材，只是慢慢被挡在了冰箱后面。
          </h2>
          <p>
            买菜那天还记得很清楚。几天以后，牛肉被新的袋子挡住，鸡蛋只剩几个也没人确定。直到再次采购，或者准备做饭时翻遍冰箱，我们才重新想起它们。
          </p>
        </div>
        <ul className="landing-problem-list" aria-label="常见的食材管理问题">
          <li>看不见还剩多少</li>
          <li>想不起哪天买的</li>
          <li>出门后无法确认</li>
          <li>临期时没有提醒</li>
        </ul>
        <div className="landing-problem-visual">
          <FridgeShelfSvg />
        </div>
      </LandingSection>

      <LandingSection
        className="landing-lifecycle"
        id="lifecycle"
        labelledBy="lifecycle-title"
        snap
      >
        <div className="landing-section-copy">
          <p className="landing-kicker">FOOD LIFECYCLE</p>
          <h2 id="lifecycle-title">
            从买回来，到用掉，再回到下一次采购。
          </h2>
          <p>
            食材不是录入一次就结束了。冰箱精灵把购买、存放、提醒、做饭和补货接在一起，让每一次变化都能继续为下一步所用。
          </p>
        </div>
        <ol className="landing-lifecycle-list">
          {lifecycleSteps.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <p className="landing-section-note">
          这是食材的完整生命周期，也是一份会继续流动的数据。
        </p>
      </LandingSection>

      <LandingSection
        className="landing-iot"
        id="iot"
        labelledBy="iot-title"
      >
        <div className="landing-section-copy">
          <p className="landing-kicker">HOME AIoT · ONE SHARED INVENTORY</p>
          <h2 id="iot-title">冰箱旁和手机上，始终是同一份库存。</h2>
          <p>
            在家时，可以直接对冰箱旁的小屏说一句，或者伸手完成操作。出门买菜时，手机仍能看到家里还有什么。两个入口共享同一份实时库存，也共同组成一套贴近日常使用的家庭
            IoT。
          </p>
        </div>
        <ul className="landing-system-labels">
          <li>冰箱旁的小屏</li>
          <li>家人手中的应用</li>
          <li>实时同步</li>
          <li>家庭共享库存</li>
        </ul>
      </LandingSection>

      <LandingSection
        className="landing-multimodal"
        id="multimodal"
        labelledBy="multimodal-title"
      >
        <div className="landing-section-copy">
          <p className="landing-kicker">VOICE · VISION · TOUCH · TEXT</p>
          <h2 id="multimodal-title">手上拿着东西时，可以直接开口说。</h2>
          <p>
            想确认细节时可以触摸，手机上也可以慢慢编辑。视觉识别已经进入
            Demo；在它还不够完善的地方，语音、触摸和文字会继续接住你。
          </p>
        </div>
        <dl className="landing-modalities">
          <div>
            <dt>语音</dt>
            <dd>“帮我放一盒酸奶和六个鸡蛋。”</dd>
          </div>
          <div>
            <dt>视觉</dt>
            <dd>让摄像头看见刚刚放入的食材</dd>
            <small>AVAILABLE IN DEMO · STILL IMPROVING</small>
          </div>
          <div>
            <dt>触摸</dt>
            <dd>在冰箱旁直接确认数量与批次</dd>
          </div>
          <div>
            <dt>文字</dt>
            <dd>在手机上完整编辑、搜索与规划</dd>
          </div>
        </dl>
      </LandingSection>

      <section className="landing-capabilities" aria-label="核心能力">
        {capabilities.map((capability) => (
          <article className="pixel-card" key={capability.number}>
            <span>{capability.number}</span>
            <h2>{capability.title}</h2>
            <p>{capability.body}</p>
          </article>
        ))}
      </section>

      <LandingSection
        className="landing-physical-data"
        id="why"
        labelledBy="physical-data-title"
        snap
      >
        <p className="landing-kicker">PHYSICAL DATA AT HOME</p>
        <h2 id="physical-data-title">
          家里的东西，也应该留下可以继续使用的信息。
        </h2>
        <div className="landing-prose">
          <p>
            聊天记录很容易搜索，菜市场买回来的菜却很少留下什么。家里总要有人记得牛奶什么时候买、鸡蛋还剩多少、那袋牛肉是不是该先吃。
          </p>
          <p>
            冰箱精灵关心的并不只是一张库存清单。它想让真实物品在进入和离开时留下信息，让家庭中的实体数据也能被看见、被理解，并在下一次做饭或采购时继续发挥作用。
          </p>
        </div>
      </LandingSection>

      <LandingSection
        className="landing-ubiquitous"
        labelledBy="ubiquitous-title"
      >
        <div className="landing-section-copy">
          <p className="landing-kicker">UBIQUITOUS AI · A QUIET INTERFACE</p>
          <h2 id="ubiquitous-title">今天先从冰箱开始。</h2>
          <p>
            这个小终端不需要成为家里又一台被学习和照顾的设备。它只是待在物品经过的地方，听见、看见、记住，然后在需要时回应。
          </p>
          <p>
            今天它在冰箱旁，理解食材的流转。今后，同样的方式也可以走到衣柜或药柜旁边。终端慢慢退到环境里，生活本身成为与智能交互的入口。
          </p>
        </div>
        <ul className="landing-scene-labels">
          <li>冰箱 · 食材</li>
          <li>衣柜 · 衣物</li>
          <li>药柜 · 药品</li>
        </ul>
      </LandingSection>

      <LandingSection
        className="landing-experience"
        id="experience"
        labelledBy="experience-title"
        snap
      >
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
              正式版本发布后，最新安装包会自动出现在这里。现在可以先打开在线
              Demo，完整体验冰箱精灵。
            </p>
          )}
        </section>

        <div className="landing-final-cta">
          <p className="landing-kicker">TRY THE WHOLE JOURNEY</p>
          <h2 id="experience-title">先看看它怎样照看一颗鸡蛋。</h2>
          <p>
            从放进冰箱、更新数量，到被提醒、做成一餐，再回到下一次采购。
          </p>
          <div className="landing-actions">
            <a
              className="landing-button landing-button-primary"
              href="/demo"
              aria-label="体验完整 Demo"
              onClick={openDemo}
            >
              体验完整 Demo
              <span aria-hidden="true">→</span>
            </a>
            {release ? (
              <a
                className="landing-button landing-button-secondary"
                href="/api/download/android"
                aria-label="获取 Android APK"
              >
                获取 Android APK
                <span aria-hidden="true">↓</span>
              </a>
            ) : (
              <span className="landing-button landing-button-disabled">
                获取 Android APK · 准备中
              </span>
            )}
            {release ? (
              <a
                className="landing-text-link"
                href={release.releaseUrl}
                target="_blank"
                rel="noreferrer"
              >
                查看最新 Release
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>
      </LandingSection>

      <footer className="landing-footer">
        <span>FRIDGE ELF · ADVX 2026</span>
        <span>HACKATHON DEMO · WORK IN PROGRESS</span>
      </footer>
    </main>
  )
}
