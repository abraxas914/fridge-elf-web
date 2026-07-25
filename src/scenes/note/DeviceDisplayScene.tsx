import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { AudioCue } from '../../app/ports'
import { PixelIcon } from '../../catalog/pixelIcons'
import './DeviceDisplayScene.css'

type DisplayMode = 'sleep' | 'awake' | 'voice'
type DisplayWidget = 'meals' | 'calendar' | 'weather'
type TopContent = 'default' | 'voice-reply' | 'note'

const QUICK_NOTES = [
  { text: '桌上有水果', icon: 'apple' as const },
  { text: '面条快过期啦', icon: 'noodle' as const },
  { text: '早点回家', icon: 'heart' as const },
  { text: '记得喝牛奶', icon: 'milk' as const },
] as const

const WIDGET_LABELS: Record<DisplayWidget, string> = {
  meals: 'MEALS · 三餐',
  calendar: 'CAL · 日历',
  weather: 'WEATHER · 天气',
}

interface DeviceDisplaySceneProps {
  active?: boolean
  reducedMotion: boolean
  onToast: (message: string) => void
  onCue?: (cue: AudioCue) => void
  now?: () => Date
}

function DefaultFace() {
  return (
    <div className="kawaii-face" data-testid="display-default-face">
      <svg viewBox="0 0 40 22" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="8" y="10" width="2" height="2" fill="#FFFFFF" />
        <rect x="10" y="8" width="2" height="2" fill="#FFFFFF" />
        <rect x="12" y="10" width="2" height="2" fill="#FFFFFF" />
        <rect x="26" y="10" width="2" height="2" fill="#FFFFFF" />
        <rect x="28" y="8" width="2" height="2" fill="#FFFFFF" />
        <rect x="30" y="10" width="2" height="2" fill="#FFFFFF" />
        <rect x="4" y="13" width="4" height="4" fill="#E88A6A" />
        <rect x="32" y="13" width="4" height="4" fill="#E88A6A" />
        <rect x="17" y="15" width="2" height="2" fill="#FFFFFF" />
        <rect x="21" y="15" width="2" height="2" fill="#FFFFFF" />
        <rect x="19" y="16" width="2" height="1" fill="#FFFFFF" />
      </svg>
    </div>
  )
}

function DefaultStatus() {
  return (
    <div className="status-icons" data-testid="display-default-status">
      <span className="si">
        <svg viewBox="0 0 12 20" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="4" y="2" width="4" height="12" fill="#E88A6A" stroke="#E88A6A" strokeWidth=".5" />
          <rect x="3" y="14" width="6" height="4" fill="#E88A6A" />
          <circle cx="6" cy="16" r="3.5" fill="#E88A6A" />
          <rect x="5" y="5" width="2" height="8" fill="#B04A32" />
        </svg>
      </span>
      <span className="si">
        <svg viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="9" y="2" width="2" height="16" fill="#FFFFFF" />
          <rect x="2" y="9" width="16" height="2" fill="#FFFFFF" />
          <rect x="5" y="5" width="2" height="2" fill="#FFFFFF" transform="rotate(45 6 6)" />
          <line x1="4" y1="4" x2="16" y2="16" stroke="#FFFFFF" strokeWidth="2" />
          <line x1="16" y1="4" x2="4" y2="16" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </span>
      <span className="si">
        <svg viewBox="0 0 12 20" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M 6 2 L 2 12 Q 2 17 6 17 Q 10 17 10 12 Z" fill="#E88A6A" />
        </svg>
      </span>
    </div>
  )
}

function SleepContent() {
  return (
    <div className="mf-sleep-content">
      <svg className="sleep-icon" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
        <circle cx="16" cy="16" r="10" fill="none" stroke="#C8C0A8" strokeWidth="2" />
        <circle cx="12" cy="14" r="1.5" fill="#C8C0A8" />
        <circle cx="20" cy="14" r="1.5" fill="#C8C0A8" />
        <path d="M 12 20 Q 16 18 20 20" stroke="#C8C0A8" strokeWidth="1.5" fill="none" />
      </svg>
      <div className="zzz-anim"><span>Z</span><span>z</span><span>z</span></div>
      <div className="sleep-txt">E-INK · POWER SAVE</div>
      <div className="sleep-txt sleep-tap">TAP TO WAKE</div>
    </div>
  )
}

function VoiceContent() {
  return (
    <div className="mf-voice-content">
      <svg viewBox="0 0 32 42" width="46" height="60" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="12" y="4" width="8" height="18" fill="#FFFFFF" stroke="#2B2117" strokeWidth="1.5" rx="4" />
        <path d="M 6 20 Q 6 30 16 30 Q 26 30 26 20" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <rect x="14" y="30" width="4" height="5" fill="#FFFFFF" />
        <rect x="10" y="35" width="12" height="2" fill="#FFFFFF" />
      </svg>
      <div className="voice-wave">
        <span /><span /><span /><span /><span />
      </div>
      <div className="voice-txt">
        <span className="vs">◉ LISTENING…</span>
        “打开冰箱看看有啥”
      </div>
    </div>
  )
}

function WidgetContent({
  widget,
  now,
}: {
  widget: DisplayWidget
  now: Date
}) {
  if (widget === 'meals') {
    return (
      <div className="widget-display meals" data-testid="display-widget-meals">
        <div className="wd-title">◆ TODAY MEALS · 今日三餐 ◆</div>
        <div className="wd-meal"><span className="m-t">早</span>燕麦香蕉杯 · 270K</div>
        <div className="wd-meal"><span className="m-t">午</span>番茄鸡蛋碗 · 320K</div>
        <div className="wd-meal"><span className="m-t">晚</span>白菜汤面 · 410K</div>
        <div className="wd-title wd-total">TOTAL · 1000 KCAL</div>
      </div>
    )
  }
  if (widget === 'calendar') {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .map((part) => [part.type, part.value]),
    )
    return (
      <div className="widget-display calendar" data-testid="display-widget-calendar">
        <div className="wd-title">TODAY · 日程</div>
        <div className="wd-date">{Number(parts.day)}</div>
        <div className="wd-month">{parts.year}.{parts.month}</div>
        <div className="wd-week">{parts.weekday}</div>
        <div className="wd-time">{parts.hour}:{parts.minute}</div>
      </div>
    )
  }
  return (
    <div className="widget-display weather" data-testid="display-widget-weather">
      <div className="wd-title">◆ HANGZHOU · 杭州 ◆</div>
      <PixelIcon name="weather" className="wd-icon pxi" />
      <div className="wd-temp">26°C 晴</div>
      <div className="wd-humid">湿度 55% · 风力 2 级</div>
      <div className="wd-tip">☂ 出门带瓶水~</div>
    </div>
  )
}

export function DeviceDisplayScene({
  active = true,
  reducedMotion,
  onToast,
  onCue = () => undefined,
  now = () => new Date(),
}: DeviceDisplaySceneProps) {
  const [mode, setMode] = useState<DisplayMode>('sleep')
  const [widget, setWidget] = useState<DisplayWidget | null>(null)
  const [topContent, setTopContent] = useState<TopContent>('default')
  const [draft, setDraft] = useState('')
  const [visibleNote, setVisibleNote] = useState('')
  const [noteComplete, setNoteComplete] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [badge, setBadge] = useState('◐ 休眠')
  const sleepTimer = useRef<number | null>(null)
  const voiceTimer = useRef<number | null>(null)
  const pulseTimer = useRef<number | null>(null)
  const toastTimer = useRef<number | null>(null)
  const typeTimer = useRef<number | null>(null)

  const clearTimer = (timer: MutableRefObject<number | null>) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const clearTyping = () => {
    if (typeTimer.current !== null) window.clearInterval(typeTimer.current)
    typeTimer.current = null
  }

  const sleep = () => {
    clearTimer(sleepTimer)
    setMode('sleep')
    setWidget(null)
    setTopContent('default')
    setVisibleNote('')
    setNoteComplete(false)
    setBadge('◐ 休眠 · E-INK')
  }

  const scheduleSleep = () => {
    clearTimer(sleepTimer)
    sleepTimer.current = window.setTimeout(sleep, 15_000)
  }

  const awake = () => {
    setMode('awake')
    setWidget(null)
    setTopContent('default')
    setVisibleNote('')
    setNoteComplete(false)
    setBadge('● 唤醒 · AWAKE')
    scheduleSleep()
  }

  useEffect(
    () => () => {
      clearTimer(sleepTimer)
      clearTimer(voiceTimer)
      clearTimer(pulseTimer)
      clearTimer(toastTimer)
      clearTyping()
    },
    [],
  )

  const toggleScreen = () => {
    if (mode === 'sleep') {
      onCue('wake')
      awake()
    } else {
      onCue('tick')
      sleep()
    }
  }

  const wakeScreen = () => {
    if (mode !== 'sleep') return
    onCue('wake')
    awake()
  }

  const loadWidget = (nextWidget: DisplayWidget) => {
    onCue('ding')
    setMode('awake')
    setWidget(nextWidget)
    setTopContent('default')
    setVisibleNote('')
    setNoteComplete(false)
    setBadge(WIDGET_LABELS[nextWidget])
    scheduleSleep()
  }

  const triggerVoice = () => {
    onCue('wake')
    clearTimer(voiceTimer)
    clearTimer(sleepTimer)
    setMode('voice')
    setBadge('VOICE · 语音互动')
    voiceTimer.current = window.setTimeout(() => {
      onCue('success')
      setMode('awake')
      setWidget(null)
      setTopContent('voice-reply')
      setBadge('● 唤醒 · AWAKE')
      scheduleSleep()
    }, 3_200)
  }

  const typeNote = (text: string) => {
    clearTyping()
    setVisibleNote(reducedMotion ? text : '')
    setNoteComplete(reducedMotion)
    if (reducedMotion) return
    let index = 0
    typeTimer.current = window.setInterval(() => {
      index += 1
      setVisibleNote(text.slice(0, index))
      if (index >= text.length) {
        clearTyping()
        setNoteComplete(true)
      }
    }, 55)
  }

  const sendNote = () => {
    const text = draft.trim()
    if (!text) {
      onCue('error')
      onToast('先写点什么吧 ~')
      return
    }
    onCue('boop')
    clearTimer(sleepTimer)
    setMode('awake')
    setTopContent('note')
    setPulse(true)
    setBadge('NOTE · LIVE')
    typeNote(text)
    setDraft('')
    clearTimer(pulseTimer)
    pulseTimer.current = window.setTimeout(() => setPulse(false), 600)
    clearTimer(toastTimer)
    toastTimer.current = window.setTimeout(() => {
      onCue('ding')
      onToast('✓ 已推送到冰箱屏')
    }, 400)
    scheduleSleep()
  }

  const screenClass = [
    'mf-screen',
    mode,
    mode === 'awake' && widget ? widget : '',
    pulse ? 'pulse' : '',
  ].filter(Boolean).join(' ')

  return (
    <section
      className={`tab${active ? ' active' : ''}`}
      data-tab="note"
      data-testid="note-scene"
      hidden={!active}
    >
      <div className="section-title">
        <span className="en">DISPLAY</span>
        <span className="cn">冰箱显示屏</span>
        <span className="badge" data-testid="display-mode-badge">{badge}</span>
      </div>
      <div className="preview-strip">LOCAL PREVIEW · NO FIRMWARE CONTROL</div>

      <div className="display-device">
        <div className="dd-handle" />
        <div className="dd-speaker">
          <svg viewBox="0 0 20 20" shapeRendering="crispEdges" aria-hidden="true">
            {[4, 8, 12, 16].flatMap((y) =>
              [3, 7, 11, 15].map((x) => (
                <circle cx={x} cy={y} r="1" fill="#8A6B58" key={`${x}-${y}`} />
              )),
            )}
          </svg>
        </div>

        <button
          className={screenClass}
          type="button"
          onClick={wakeScreen}
          aria-label={mode === 'sleep' ? '唤醒冰箱显示屏' : '冰箱显示屏已唤醒'}
          data-testid="device-screen"
        >
          <div className="screen-normal">
            <div className="screen-top">
              {topContent === 'default' ? <DefaultFace /> : null}
              {topContent === 'voice-reply' ? (
                <div className="screen-top-msg">
                  好的！<div className="emoji-row">✨ 已打开冰箱 ✨</div>
                </div>
              ) : null}
              {topContent === 'note' ? (
                <div className="screen-top-msg" data-testid="display-note">
                  {visibleNote}
                  {noteComplete ? <span className="mf-cursor" /> : null}
                </div>
              ) : null}
            </div>
            <div className="screen-bottom">
              {widget ? <WidgetContent widget={widget} now={now()} /> : <DefaultStatus />}
            </div>
          </div>
          <SleepContent />
          <VoiceContent />
        </button>

        <div className="dd-feet"><span className="f" /><span className="f" /></div>
      </div>

      <div className="dd-controls">
        <button className="dd-btn" type="button" onClick={toggleScreen}>
          {mode === 'sleep' ? '◐ 唤醒' : '◑ 休眠'}
        </button>
        <button className="dd-btn dd-voice" type="button" onClick={triggerVoice}>
          <PixelIcon name="mic" className="pxi quick-px" />语音互动
        </button>
      </div>

      <div className="section-title">
        <span className="en">WIDGETS</span>
        <span className="cn">组件 · 点击加到屏上</span>
      </div>
      <div className="widget-picker">
        {([
          ['meals', 'mealbox', '三餐', 'MEALS'],
          ['calendar', 'calendar', '日历', 'CALENDAR'],
          ['weather', 'weather', '天气', 'WEATHER'],
        ] as const).map(([key, icon, name, sub]) => (
          <button
            className={`widget-card${widget === key ? ' active' : ''}`}
            type="button"
            onClick={() => loadWidget(key)}
            aria-pressed={widget === key}
            key={key}
          >
            <PixelIcon name={icon} className="w-icon pxi" />
            <span className="w-name">{name}</span>
            <span className="w-sub">{sub}</span>
          </button>
        ))}
      </div>

      <div className="msg-input-wrap">
        <div className="section-title send-title">
          <span className="en">SEND</span><span className="cn">发送便签</span>
        </div>
        <label className="sr-only" htmlFor="display-note-input">发送便签</label>
        <textarea
          className="msg-input"
          id="display-note-input"
          rows={2}
          maxLength={40}
          placeholder="敲一句话给家人 / 给自己 ~"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="msg-quick">
          {QUICK_NOTES.map((note) => (
            <button
              className="quick-chip"
              type="button"
              onClick={() => {
                onCue('tick')
                setDraft(note.text)
              }}
              key={note.text}
            >
              <PixelIcon name={note.icon} className="pxi quick-px" />
              {note.text}
            </button>
          ))}
        </div>
        <div className="msg-send-row">
          <div className="msg-from">✎ Alice · 手机端</div>
          <button className="send-btn" type="button" onClick={sendNote}>发送 ▶</button>
        </div>
      </div>
    </section>
  )
}
