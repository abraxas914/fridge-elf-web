import { useEffect, useState } from 'react'
import type { StateStoragePort } from '../../app/ports'
import { PixelIcon, type PixelIconName } from '../../catalog/pixelIcons'
import './ProfileScene.css'

type LivingMode = 'solo' | 'family' | 'roomie'

interface ProfileState {
  living: LivingMode
  taste: string
  fitness: string
  routine: string
  health: string
  expireAlert: boolean
  cameraScan: boolean
  nightDim: boolean
  agentEnabled: boolean
}

interface ProfileSceneProps {
  storage?: StateStoragePort
}

const defaults: ProfileState = {
  living: 'solo',
  taste: 'clean',
  fitness: 'balance',
  routine: 'normal',
  health: '',
  expireAlert: true,
  cameraScan: true,
  nightDim: false,
  agentEnabled: true,
}

function loadProfile(storage: Pick<Storage, 'getItem'> = localStorage) {
  try {
    return {
      ...defaults,
      ...JSON.parse(storage.getItem('fridge-profile-v1') ?? '{}'),
    } as ProfileState
  } catch {
    return defaults
  }
}

function ChoiceGroup({
  value,
  choices,
  onChange,
}: {
  value: string
  choices: readonly [string, PixelIconName, string][]
  onChange: (value: string) => void
}) {
  return (
    <div className="profile-choice-grid">
      {choices.map(([key, icon, label]) => (
        <button
          aria-pressed={value === key}
          className={value === key ? 'selected' : ''}
          type="button"
          key={key}
          onClick={() => onChange(key)}
        >
          <PixelIcon name={icon} className="profile-choice-icon" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

export function ProfileScene({
  storage = localStorage,
}: ProfileSceneProps = {}) {
  const [profile, setProfile] = useState(() => loadProfile(storage))
  const update = <K extends keyof ProfileState>(
    key: K,
    value: ProfileState[K],
  ) => setProfile((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    storage.setItem('fridge-profile-v1', JSON.stringify(profile))
  }, [profile, storage])

  return (
    <section
      className="tab active profile-scene"
      data-tab="me"
      data-testid="me-scene"
    >
      <div className="profile-hero">
        <div className="profile-avatar">
          <PixelIcon name="person" className="profile-avatar-icon" />
        </div>
        <div>
          <h2>HI, 冰箱主人</h2>
          <p>欢迎回来，今天也照顾好自己。</p>
          <span>“好好吃饭是爱自己的开始”</span>
        </div>
      </div>

      <div className="profile-card">
        <h3><b>LIVING</b> 居住模式</h3>
        <ChoiceGroup
          value={profile.living}
          choices={[
            ['solo', 'home', '独居'],
            ['family', 'family', '家庭'],
            ['roomie', 'roomie', '合租'],
          ]}
          onChange={(value) => update('living', value as LivingMode)}
        />
        <div className="profile-members">
          <b>
            {profile.living === 'family'
              ? '家庭成员'
              : profile.living === 'roomie'
                ? '合租成员'
                : '陪伴选择'}
          </b>
          <div>
            <span>
              <PixelIcon name="person" className="profile-member-icon" />我
            </span>
            {profile.living === 'family' ? (
              <>
                <span>
                  <PixelIcon
                    name="person-a"
                    className="profile-member-icon"
                  />爸爸
                </span>
                <span>
                  <PixelIcon
                    name="person-b"
                    className="profile-member-icon"
                  />妈妈
                </span>
              </>
            ) : null}
            {profile.living === 'roomie' ? (
              <span>
                <PixelIcon
                  name="person-c"
                  className="profile-member-icon"
                />室友 A
              </span>
            ) : null}
            {profile.living === 'solo' ? (
              <>
                <span>
                  <PixelIcon
                    name="pet-cat"
                    className="profile-member-icon"
                  />猫咪
                </span>
                <span>
                  <PixelIcon
                    name="pet-dog"
                    className="profile-member-icon"
                  />小狗
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3><b>TASTE</b> 口味偏好</h3>
        <ChoiceGroup
          value={profile.taste}
          choices={[
            ['spicy', 'spice', '重口'],
            ['hunan', 'pot', '湘菜'],
            ['clean', 'leaf', '清淡'],
            ['custom', 'plus', '自定义'],
          ]}
          onChange={(value) => update('taste', value)}
        />
        <p className="profile-note">
          AI 推荐食谱时会结合这里的辣度、油盐和地方菜偏好。
        </p>
      </div>

      <div className="profile-card">
        <h3><b>FITNESS</b> 健身选择</h3>
        <ChoiceGroup
          value={profile.fitness}
          choices={[
            ['gain', 'dumbbell', '增肌'],
            ['balance', 'balance', '均衡'],
            ['light', 'run', '控脂'],
          ]}
          onChange={(value) => update('fitness', value)}
        />
      </div>

      <div className="profile-card">
        <h3><b>ROUTINE</b> 常规选择</h3>
        <ChoiceGroup
          value={profile.routine}
          choices={[
            ['normal', 'rice', '常规'],
            ['quick', 'clock', '快手'],
            ['plan', 'calendar', '规划'],
          ]}
          onChange={(value) => update('routine', value)}
        />
      </div>

      <div className="profile-card">
        <h3><b>HEALTH</b> 病史 / 过敏源 / 忌口</h3>
        <textarea
          aria-label="健康与忌口说明"
          maxLength={120}
          value={profile.health}
          placeholder="例如：乳糖不耐、海鲜过敏、少盐、胃不舒服时忌辛辣"
          onChange={(event) => update('health', event.target.value)}
        />
        <div className="profile-health-pills">
          <span>忌口提醒</span><span>少盐少油</span><span>避开过敏源</span>
        </div>
      </div>

      {([
        ['expireAlert', 'alert', '临期提醒', 'EXPIRE ALERT'],
        ['cameraScan', 'camera', '摄像头识别', 'CAM AUTO SCAN'],
        ['nightDim', 'moon', '夜间省电', 'NIGHT DIM'],
        ['agentEnabled', 'bot', 'Agent Chat Bot', 'AI ASSISTANT'],
      ] as const).map(([key, icon, title, subtitle]) => (
        <div className="profile-setting-row" key={key}>
          <PixelIcon name={icon} className="profile-setting-icon" />
          <div><b>{title}</b><span>{subtitle}</span></div>
          <button
            className={profile[key] ? 'on' : ''}
            type="button"
            role="switch"
            aria-checked={profile[key]}
            aria-label={title}
            onClick={() => update(key, !profile[key])}
          />
        </div>
      ))}
    </section>
  )
}
