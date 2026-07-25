import { useState } from 'react'
import type { AudioCue } from '../../app/ports'
import type { PixelIconName } from '../../catalog/pixelIcons'
import { PixelIcon } from '../../catalog/pixelIcons'
import './ProfileScene.css'

type LivingMode = 'solo' | 'family' | 'roomie'
type SettingKey = 'expire' | 'camera' | 'night' | 'bot'

interface ProfileSceneProps {
  active?: boolean
  onToast: (message: string) => void
  onCue?: (cue: AudioCue) => void
}

function ProfileCardTitle({
  english,
  chinese,
}: {
  english: string
  chinese: string
}) {
  return (
    <div className="p-card-title">
      <span className="en">{english}</span>
      <span className="cn">{chinese}</span>
    </div>
  )
}

function ModePicker<T extends string>({
  value,
  options,
  className = '',
  onChange,
}: {
  value: T
  options: readonly {
    value: T
    label: string
    icon: PixelIconName
  }[]
  className?: string
  onChange: (value: T, label: string) => void
}) {
  return (
    <div className={`mode-picker${className ? ` ${className}` : ''}`}>
      {options.map((option) => (
        <button
          className={`mode-btn${value === option.value ? ' on' : ''}`}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value, option.label)}
          key={option.value}
        >
          <PixelIcon name={option.icon} className="mi pxi" />
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ResidentPanel({
  title,
  tag,
  selected,
  members,
  onSelect,
  onAdd,
  testId,
}: {
  title: string
  tag: string
  selected: string
  members: readonly {
    value: string
    label: string
    icon: PixelIconName
    me?: boolean
  }[]
  onSelect: (value: string, label: string) => void
  onAdd: () => void
  testId: string
}) {
  return (
    <div className="resident-panel" data-testid={testId}>
      <div className="resident-title">
        <span>{title}</span><span className="tag">{tag}</span>
      </div>
      <div className="family-row">
        {members.map((member) => (
          <button
            className={`family-member${member.me ? ' me' : ''}${selected === member.value ? ' on' : ''}`}
            type="button"
            aria-pressed={selected === member.value}
            onClick={() => onSelect(member.value, member.label)}
            key={member.value}
          >
            <PixelIcon name={member.icon} className="fm-avatar pxi" />
            <span className="fm-name">{member.label}</span>
          </button>
        ))}
        <button className="family-member fm-add" type="button" onClick={onAdd}>
          <PixelIcon name="plus" className="fm-avatar pxi" />
          <span className="fm-name">添加</span>
        </button>
      </div>
    </div>
  )
}

export function ProfileScene({
  active = true,
  onToast,
  onCue = () => undefined,
}: ProfileSceneProps) {
  const [living, setLiving] = useState<LivingMode>('solo')
  const [taste, setTaste] = useState('spicy')
  const [fitness, setFitness] = useState('balance')
  const [routine, setRoutine] = useState('normal')
  const [health, setHealth] = useState('')
  const [soloMate, setSoloMate] = useState('cat')
  const [familyMember, setFamilyMember] = useState('me')
  const [roommate, setRoommate] = useState('me')
  const [settings, setSettings] = useState<Record<SettingKey, boolean>>({
    expire: true,
    camera: true,
    night: false,
    bot: true,
  })

  const selectMode = <T extends string>(
    setter: (value: T) => void,
    value: T,
    label: string,
  ) => {
    onCue('tick')
    setter(value)
    onToast(`✓ 已切换：${label}`)
  }

  const selectResident = (
    setter: (value: string) => void,
    value: string,
    label: string,
  ) => {
    onCue('tick')
    setter(value)
    onToast(`✓ 已选择：${label}`)
  }

  const toggleSetting = (key: SettingKey) => {
    const next = !settings[key]
    onCue(next ? 'success' : 'tick')
    setSettings((current) => ({ ...current, [key]: next }))
    onToast(next ? '✓ 已开启' : '✕ 已关闭')
  }

  return (
    <section
      className={`tab${active ? ' active' : ''}`}
      data-tab="me"
      data-testid="me-scene"
      hidden={!active}
    >
      <div className="profile-hero">
        <div className="avatar">
          <svg viewBox="0 0 32 32" width="46" height="46" shapeRendering="crispEdges" aria-hidden="true">
            <rect x="10" y="6" width="12" height="12" fill="#E89870" stroke="#2B2117" strokeWidth="1.5" />
            <rect x="8" y="3" width="16" height="7" fill="#5A4530" stroke="#2B2117" strokeWidth="1.5" />
            <rect x="12" y="10" width="2" height="2" fill="#2B2117" />
            <rect x="18" y="10" width="2" height="2" fill="#2B2117" />
            <rect x="14" y="15" width="4" height="1.5" fill="#2B2117" />
            <rect x="8" y="18" width="16" height="10" fill="#7A9968" stroke="#2B2117" strokeWidth="1.5" />
            <circle cx="16" cy="23" r="1" fill="#E8B84A" />
          </svg>
        </div>
        <div className="avatar-info">
          <div className="avatar-name">HI, ALICE ♥</div>
          <div className="avatar-sub">欢迎回来，今天也照顾好自己。</div>
          <span className="avatar-signature">“好好吃饭是爱自己的开始”</span>
          <span className="avatar-preview">LOCAL PREVIEW</span>
        </div>
      </div>

      <div className="p-card">
        <ProfileCardTitle english="LIVING" chinese="居住模式" />
        <ModePicker
          value={living}
          options={[
            { value: 'solo', label: '独居', icon: 'home' },
            { value: 'family', label: '家庭', icon: 'family' },
            { value: 'roomie', label: '合租', icon: 'roomie' },
          ]}
          onChange={(value, label) =>
            selectMode(setLiving, value, label)
          }
        />
        {living === 'family' ? (
          <ResidentPanel
            title="家庭成员"
            tag="MEMBERS"
            selected={familyMember}
            members={[
              { value: 'me', label: '我', icon: 'person', me: true },
              { value: 'dad', label: '爸爸', icon: 'person-a' },
              { value: 'mom', label: '妈妈', icon: 'person-b' },
              { value: 'brother', label: '弟弟', icon: 'kid' },
            ]}
            onSelect={(value, label) =>
              selectResident(setFamilyMember, value, label)
            }
            onAdd={() => onToast('邀请家人扫码加入')}
            testId="family-panel"
          />
        ) : null}
        {living === 'solo' ? (
          <ResidentPanel
            title="陪伴选择"
            tag="SOLO MATE"
            selected={soloMate}
            members={[
              { value: 'cat', label: '猫咪', icon: 'pet-cat' },
              { value: 'dog', label: '小狗', icon: 'pet-dog' },
              { value: 'rabbit', label: '兔兔', icon: 'pet-rabbit' },
            ]}
            onSelect={(value, label) =>
              selectResident(setSoloMate, value, label)
            }
            onAdd={() => onToast('自定义陪伴角色')}
            testId="pet-panel"
          />
        ) : null}
        {living === 'roomie' ? (
          <ResidentPanel
            title="合租成员"
            tag="ROOMIES"
            selected={roommate}
            members={[
              { value: 'me', label: '我', icon: 'person', me: true },
              { value: 'roommate-a', label: '室友 A', icon: 'person-c' },
            ]}
            onSelect={(value, label) =>
              selectResident(setRoommate, value, label)
            }
            onAdd={() => onToast('邀请室友加入')}
            testId="roomie-panel"
          />
        ) : null}
      </div>

      <div className="p-card">
        <ProfileCardTitle english="TASTE" chinese="偏好设置" />
        <ModePicker
          value={taste}
          className="taste-picker"
          options={[
            { value: 'spicy', label: '重口', icon: 'spice' },
            { value: 'hunan', label: '湘菜', icon: 'pot' },
            { value: 'clean', label: '清淡', icon: 'leaf' },
            { value: 'custom', label: '自定义', icon: 'plus' },
          ]}
          onChange={(value, label) =>
            selectMode(setTaste, value, label)
          }
        />
        <div className="setting-note">
          用于推荐菜谱时调整口味，比如辣度、油盐、地方菜偏好。
        </div>
      </div>

      <div className="p-card">
        <ProfileCardTitle english="FITNESS" chinese="健身选择" />
        <ModePicker
          value={fitness}
          options={[
            { value: 'gain', label: '增肌', icon: 'dumbbell' },
            { value: 'balance', label: '均衡', icon: 'balance' },
            { value: 'light', label: '控脂', icon: 'run' },
          ]}
          onChange={(value, label) =>
            selectMode(setFitness, value, label)
          }
        />
      </div>

      <div className="p-card">
        <ProfileCardTitle english="ROUTINE" chinese="常规选择" />
        <ModePicker
          value={routine}
          options={[
            { value: 'normal', label: '常规', icon: 'rice' },
            { value: 'quick', label: '快手', icon: 'clock' },
            { value: 'plan', label: '规划', icon: 'calendar' },
          ]}
          onChange={(value, label) =>
            selectMode(setRoutine, value, label)
          }
        />
      </div>

      <div className="p-card">
        <ProfileCardTitle
          english="HEALTH"
          chinese="健康 · 病史 / 过敏源 / 忌口"
        />
        <label className="sr-only" htmlFor="health-input">健康与忌口说明</label>
        <textarea
          className="health-input"
          id="health-input"
          maxLength={80}
          placeholder="例如：乳糖不耐、海鲜过敏、少盐、胃不舒服时忌辛辣…"
          value={health}
          onChange={(event) => setHealth(event.target.value)}
        />
        <div className="health-reminders">
          <span className="health-pill warn">忌口提醒</span>
          <span className="health-pill">少盐少油</span>
          <span className="health-pill">避开过敏源</span>
        </div>
      </div>

      {([
        ['expire', 'a', 'alert', '临期提醒', 'EXPIRE ALERT'],
        ['camera', 'b', 'camera', '摄像头识别', 'CAM AUTO SCAN'],
        ['night', 'c', 'moon', '夜间省电', 'NIGHT DIM'],
        ['bot', 'd', 'bot', 'Agent Chat Bot', 'CHAT BOT ASSISTANT'],
      ] as const).map(([key, cls, icon, title, description]) => (
        <div className="setting-row" key={key}>
          <div className="setting-l">
            <PixelIcon name={icon} className={`setting-icon ${cls} pxi`} />
            <div>
              <div className="setting-title">{title}</div>
              <div className="setting-desc">{description}</div>
            </div>
          </div>
          <button
            className={`pswitch${settings[key] ? ' on' : ''}`}
            type="button"
            role="switch"
            aria-checked={settings[key]}
            aria-label={title}
            onClick={() => toggleSetting(key)}
          />
        </div>
      ))}
    </section>
  )
}
