import { useMemo, useState } from 'react'
import type { SavedRecipe } from '../../app/recipes'
import type { PlannerState, PresentedFood } from '../../app/types'
import type { DisplayState } from '../../bridge/types'
import { PixelIcon } from '../../catalog/pixelIcons'
import './DisplayScene.css'

interface DisplaySceneProps {
  items: readonly PresentedFood[]
  planner: PlannerState
  recipes: readonly SavedRecipe[]
  connected: boolean
  native?: boolean
  onSendDisplay: (state: DisplayState) => Promise<void>
  onToast: (message: string) => void
}

const quickNotes = ['桌上有水果', '面条快过期啦', '早点回家', '记得喝牛奶']
const DISPLAY_STORAGE_KEY = 'fridge-display-content-v2'
type ControllableDisplayMode = DisplayState['mode']

const selectableModes: ControllableDisplayMode[] = [
  'home',
  'note',
  'meals',
  'calendar',
  'inventory',
]

interface DisplayContent {
  mode: ControllableDisplayMode
  note: string
  meals: [string, string, string]
  date: string
  calendarText: string
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadDisplayContent(): Partial<DisplayContent> {
  try {
    const value = JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return {}
    return value
  } catch {
    return {}
  }
}

function saveDisplayContent(content: DisplayContent) {
  try {
    localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(content))
  } catch {
    // Display control still works when WebView storage is unavailable.
  }
}

export function DisplayScene({
  items,
  planner,
  recipes,
  connected,
  native = false,
  onSendDisplay,
  onToast,
}: DisplaySceneProps) {
  const savedContent = useMemo(loadDisplayContent, [])
  const plannedMeals = useMemo(
    () => Object.values(planner)
      .flatMap((day) => Object.values(day))
      .map((id) => recipes.find((recipe) => recipe.id === id)?.cn)
      .filter((name): name is string => Boolean(name))
      .slice(0, 3),
    [planner, recipes],
  )
  const storedMode = selectableModes.includes(
    savedContent.mode as ControllableDisplayMode,
  )
    ? savedContent.mode as ControllableDisplayMode
    : 'home'
  const initialMeals: [string, string, string] = [0, 1, 2].map(
    (index) => savedContent.meals?.[index] ?? plannedMeals[index] ?? '',
  ) as [string, string, string]

  const [mode, setMode] = useState<ControllableDisplayMode>(storedMode)
  const [note, setNote] = useState('')
  const [visibleNote, setVisibleNote] = useState(savedContent.note ?? '')
  const [meals, setMeals] = useState<[string, string, string]>(initialMeals)
  const [calendarDate, setCalendarDate] = useState(
    savedContent.date ?? localDateValue(),
  )
  const [calendarText, setCalendarText] = useState(
    savedContent.calendarText ?? '',
  )

  const payloadFor = (
    nextMode: ControllableDisplayMode,
    overrides: Partial<DisplayContent> = {},
  ): DisplayContent => ({
    mode: nextMode,
    note: overrides.note ?? visibleNote,
    meals: overrides.meals ?? meals,
    date: overrides.date ?? calendarDate,
    calendarText: overrides.calendarText ?? calendarText,
  })

  const applyMode = async (
    nextMode: ControllableDisplayMode,
    overrides: Partial<DisplayContent> = {},
  ) => {
    const payload = payloadFor(nextMode, overrides)
    setMode(nextMode)
    saveDisplayContent(payload)
    try {
      await onSendDisplay(payload)
      onToast(
        native
          ? connected
            ? '已发送到真实开发板'
            : '指令已提交，等待开发板联网'
          : '已更新 BROWSER MOCK 显示屏',
      )
    } catch (error) {
      onToast(error instanceof Error ? error.message : '显示屏控制失败')
    }
  }

  const sendNote = () => {
    const text = note.trim()
    if (!text) {
      onToast('先写一句便签')
      return
    }
    setVisibleNote(text)
    setNote('')
    applyMode('note', { note: text })
  }

  const sendMeals = () => {
    const normalized = meals.map((value) => value.trim()) as [
      string,
      string,
      string,
    ]
    setMeals(normalized)
    applyMode('meals', { meals: normalized })
  }

  const sendCalendar = () => {
    applyMode('calendar', {
      date: calendarDate,
      calendarText: calendarText.trim(),
    })
  }

  const dateParts = calendarDate.split('-')
  const calendarDay = Number(dateParts[2]) || new Date().getDate()
  const calendarMonth =
    dateParts.length === 3 ? `${dateParts[0]}年${Number(dateParts[1])}月` : ''
  return (
    <section className="tab active display-scene" data-tab="note" data-testid="note-scene">
      <div className="section-title">
        <span className="en">DISPLAY</span>
        <span className="cn">冰箱显示屏</span>
        <span className="badge">{connected ? '● 已连接' : '○ 等待连接'}</span>
      </div>

      <div className="display-device">
        <div className="display-handle" />
        <div className={`display-screen ${mode}`}>
          {mode === 'home' ? (
            <div className="display-home">
              <div className="display-face">
                <i className="eye left" /><i className="eye right" />
                <i className="cheek left" /><i className="cheek right" />
                <i className="mouth" />
              </div>
              <b>冰箱精灵</b>
              <span>FRIDGE HELPER · {connected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          ) : mode === 'note' ? (
            <div className="display-paper">
              <span>NOTE · 家庭便签</span>
              <p>{visibleNote || '还没有新的便签'}</p>
            </div>
          ) : mode === 'meals' ? (
            <div className="display-panel">
              <span>MEALS · 今日三餐</span>
              {['早餐', '午餐', '晚餐'].map((label, index) => (
                <p key={label}><b>{label}</b>{meals[index] || '等待规划'}</p>
              ))}
            </div>
          ) : mode === 'calendar' ? (
            <div className="display-calendar">
              <span>CALENDAR</span>
              <strong>{calendarDay}</strong>
              <b>{calendarMonth}</b>
              <p>{calendarText || '今天没有特别安排'}</p>
            </div>
          ) : (
            <div className="display-panel inventory">
              <span>INVENTORY · {items.length} 项</span>
              {items.slice(0, 6).map((food) => (
                <p key={food.id}><b>{food.name}</b>{food.quantity}</p>
              ))}
              {!items.length ? <p>冰箱清单为空</p> : null}
            </div>
          )}
        </div>
        <div className="display-feet"><i /><i /></div>
      </div>

      <div className="section-title">
        <span className="en">MODES</span>
        <span className="cn">显示模式</span>
      </div>
      <div className="display-widgets">
        {([
          ['home', 'bot', '首页'],
          ['note', 'box', '便签'],
          ['meals', 'mealbox', '三餐'],
          ['calendar', 'calendar', '日历'],
          ['inventory', 'home', '清单'],
        ] as const).map(([value, icon, label]) => (
          <button
            className={mode === value ? 'selected' : ''}
            type="button"
            key={value}
            onClick={() => applyMode(value)}
          >
            <PixelIcon name={icon} className="display-widget-icon" />
            <b>{label}</b>
          </button>
        ))}
      </div>

      {mode === 'note' ? (
        <div className="display-content-editor">
          <div className="section-title">
            <span className="en">NOTE</span>
            <span className="cn">发送便签</span>
          </div>
          <textarea
            maxLength={40}
            rows={2}
            value={note}
            placeholder="敲一句话给家人 / 给自己"
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="display-quick-notes">
            {quickNotes.map((text) => (
              <button type="button" key={text} onClick={() => setNote(text)}>{text}</button>
            ))}
          </div>
          <div className="display-send-row">
            <span>便签文字会同步到开发板</span>
            <button type="button" onClick={sendNote}>发送</button>
          </div>
        </div>
      ) : null}

      {mode === 'meals' ? (
        <div className="display-content-editor">
          <div className="section-title">
            <span className="en">MEALS</span>
            <span className="cn">今日三餐</span>
          </div>
          <div className="display-meal-fields">
            {['早餐', '午餐', '晚餐'].map((label, index) => (
              <label key={label}>
                <span>{label}</span>
                <input
                  maxLength={20}
                  value={meals[index]}
                  placeholder={plannedMeals[index] ?? '等待规划'}
                  onChange={(event) => {
                    const next = [...meals] as [string, string, string]
                    next[index] = event.target.value
                    setMeals(next)
                  }}
                />
              </label>
            ))}
          </div>
          <div className="display-send-row">
            <span>默认读取个人周规划，也可在这里调整</span>
            <button type="button" onClick={sendMeals}>同步三餐</button>
          </div>
        </div>
      ) : null}

      {mode === 'calendar' ? (
        <div className="display-content-editor">
          <div className="section-title">
            <span className="en">CAL</span>
            <span className="cn">日历内容</span>
          </div>
          <div className="display-calendar-fields">
            <label>
              <span>日期</span>
              <input
                type="date"
                value={calendarDate}
                onChange={(event) => setCalendarDate(event.target.value)}
              />
            </label>
            <label>
              <span>日程</span>
              <input
                maxLength={32}
                value={calendarText}
                placeholder="例如：晚上七点家庭聚餐"
                onChange={(event) => setCalendarText(event.target.value)}
              />
            </label>
          </div>
          <div className="display-send-row">
            <span>日期和日程会一起同步</span>
            <button type="button" onClick={sendCalendar}>同步日历</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
