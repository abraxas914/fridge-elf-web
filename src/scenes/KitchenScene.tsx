import { useEffect, useState } from 'react'
import type { AudioCue } from '../app/ports'
import './KitchenScene.css'

interface KitchenSceneProps {
  onEnter: () => void
  onCue?: (cue: AudioCue) => void
  reducedMotion?: boolean
}

export function KitchenScene({
  onEnter,
  onCue = () => undefined,
  reducedMotion = false,
}: KitchenSceneProps) {
  const [zooming, setZooming] = useState(false)

  useEffect(() => {
    if (!zooming) return
    const timer = window.setTimeout(onEnter, reducedMotion ? 1 : 800)
    return () => window.clearTimeout(timer)
  }, [onEnter, reducedMotion, zooming])

  const enterFromFridge = () => {
    onCue('ding')
    setZooming(true)
  }

  return (
    <section
      id="kitchen-scene"
      className={`scene active${zooming ? ' kitchen-zooming' : ''}`}
      data-testid="kitchen-scene"
    >
      <h1 className="sr-only">冰箱生活助手</h1>
      <button className="skip-btn" type="button" onClick={onEnter}>
        <span aria-hidden="true">SKIP ▶</span>
        <span className="sr-only">跳过</span>
      </button>
      <div className="kitchen-hint">
        ✦ CLICK THE FRIDGE ✦<span className="cn">▶ 点击冰箱进入</span>
      </div>
      <svg
        className="kitchen-stage"
        viewBox="0 0 380 320"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
        aria-label="像素厨房，点击冰箱进入"
      >
        <g>
          <polygon points="50,240 330,240 370,290 10,290" fill="#E8DBC4" stroke="#2B2117" strokeWidth="2" />
          <polygon points="90,240 130,240 105,290 55,290" fill="#B89877" opacity="0.55" />
          <polygon points="170,240 210,240 195,290 145,290" fill="#B89877" opacity="0.55" />
          <polygon points="250,240 290,240 285,290 235,290" fill="#B89877" opacity="0.55" />
          <polygon points="130,240 170,240 145,290 105,290" fill="#F5EAC8" opacity="0.6" />
          <polygon points="210,240 250,240 235,290 195,290" fill="#F5EAC8" opacity="0.6" />
          <polygon points="290,240 330,240 325,290 285,290" fill="#F5EAC8" opacity="0.6" />
        </g>
        <rect x="50" y="60" width="280" height="180" fill="#C8BFA5" stroke="#2B2117" strokeWidth="2" />
        <line x1="50" y1="120" x2="330" y2="120" stroke="#B0A895" strokeWidth="1" />
        <line x1="50" y1="180" x2="330" y2="180" stroke="#B0A895" strokeWidth="1" />
        <rect x="80" y="85" width="70" height="70" fill="#B8D5E0" stroke="#2B2117" strokeWidth="2" />
        <line x1="115" y1="85" x2="115" y2="155" stroke="#2B2117" strokeWidth="2" />
        <line x1="80" y1="120" x2="150" y2="120" stroke="#2B2117" strokeWidth="2" />
        <ellipse cx="95" cy="100" rx="8" ry="4" fill="#FFFFFF" opacity="0.6" />
        <ellipse cx="130" cy="140" rx="10" ry="4" fill="#FFFFFF" opacity="0.5" />
        <rect x="80" y="152" width="70" height="5" fill="#8A7455" stroke="#2B2117" strokeWidth="1" />
        <g className="plant-sway">
          <rect x="98" y="145" width="14" height="10" fill="#B87A5A" stroke="#2B2117" strokeWidth="1.5" />
          <path d="M 100 145 Q 95 138 98 130" stroke="#5A7A4B" strokeWidth="2.5" fill="none" />
          <path d="M 105 145 Q 110 136 105 128" stroke="#7A9968" strokeWidth="2.5" fill="none" />
          <path d="M 110 145 Q 115 138 113 132" stroke="#A8C08A" strokeWidth="2.5" fill="none" />
          <circle cx="98" cy="130" r="3" fill="#A8C08A" stroke="#2B2117" strokeWidth="1" />
          <circle cx="105" cy="128" r="3" fill="#7A9968" stroke="#2B2117" strokeWidth="1" />
          <circle cx="113" cy="132" r="2.5" fill="#5A7A4B" stroke="#2B2117" strokeWidth="1" />
        </g>
        <rect x="60" y="170" width="160" height="16" fill="#D9A868" stroke="#2B2117" strokeWidth="2" />
        <rect x="60" y="182" width="160" height="4" fill="#B88848" />
        <rect x="60" y="186" width="160" height="60" fill="#6B8FB0" stroke="#2B2117" strokeWidth="2" />
        <line x1="110" y1="186" x2="110" y2="246" stroke="#2B2117" strokeWidth="2" />
        <line x1="170" y1="186" x2="170" y2="246" stroke="#2B2117" strokeWidth="2" />
        <circle cx="85" cy="216" r="2.5" fill="#2B2117" />
        <circle cx="140" cy="216" r="2.5" fill="#2B2117" />
        <circle cx="195" cy="216" r="2.5" fill="#2B2117" />
        <rect x="60" y="240" width="160" height="6" fill="#4A6B8F" />
        <rect x="115" y="172" width="45" height="13" fill="#F5EAC8" stroke="#2B2117" strokeWidth="1.5" />
        <rect x="118" y="175" width="39" height="8" fill="#B8D5E0" opacity="0.6" />
        <circle cx="137" cy="180" r="2" fill="#2B2117" />
        <rect x="136" y="164" width="3" height="8" fill="#8A8A8A" stroke="#2B2117" strokeWidth="1" />
        <rect x="134" y="163" width="7" height="2" fill="#8A8A8A" stroke="#2B2117" strokeWidth="1" />
        <rect x="68" y="152" width="9" height="18" fill="#F5EAC8" stroke="#2B2117" strokeWidth="1.5" />
        <rect x="70" y="147" width="5" height="6" fill="#7A9968" stroke="#2B2117" strokeWidth="1" />
        <rect x="82" y="166" width="26" height="6" fill="#B87A5A" stroke="#2B2117" strokeWidth="1.5" />
        <circle cx="90" cy="163" r="3" fill="#D96B4F" stroke="#2B2117" strokeWidth="1" />
        <rect x="89" y="160" width="2" height="2" fill="#5A7A4B" />
        <rect x="172" y="150" width="40" height="20" fill="#F5EAC8" stroke="#2B2117" strokeWidth="2" />
        <rect x="175" y="153" width="26" height="14" fill="#3a3a2e" stroke="#2B2117" strokeWidth="1" />
        <rect x="177" y="155" width="18" height="3" fill="#7A9968" />
        <rect x="177" y="160" width="12" height="3" fill="#7A9968" />
        <circle cx="207" cy="160" r="1.5" fill="#2B2117" />
        <g>
          <rect x="147" y="158" width="14" height="12" fill="#F5EAC8" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="149" y="154" width="10" height="4" fill="#D9A868" stroke="#2B2117" strokeWidth="1" />
          <rect x="160" y="161" width="3" height="6" fill="none" stroke="#2B2117" strokeWidth="1.5" />
          <circle className="steam-puff" cx="151" cy="152" r="2" fill="#FFFFFF" opacity="0.6" />
          <circle className="steam-puff p2" cx="155" cy="150" r="2" fill="#FFFFFF" opacity="0.6" />
          <circle className="steam-puff p3" cx="158" cy="152" r="1.5" fill="#FFFFFF" opacity="0.6" />
        </g>
        <g
          className="fridge-hotspot"
          role="button"
          tabIndex={0}
          aria-label="点击冰箱进入"
          onClick={enterFromFridge}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') enterFromFridge()
          }}
        >
          <rect className="glow-ring" x="238" y="90" width="82" height="158" fill="none" stroke="#E8B84A" strokeWidth="3" />
          <rect x="240" y="92" width="80" height="154" fill="#F0EAD0" stroke="#2B2117" strokeWidth="2.5" />
          <line x1="240" y1="150" x2="320" y2="150" stroke="#2B2117" strokeWidth="2" />
          <rect x="240" y="92" width="6" height="154" fill="#D9CFB0" />
          <rect x="314" y="92" width="6" height="154" fill="#D9CFB0" />
          <rect x="246" y="106" width="4" height="30" fill="#8A7455" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="246" y="160" width="4" height="60" fill="#8A7455" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="278" y="102" width="34" height="22" fill="#3a3a2e" stroke="#2B2117" strokeWidth="2" />
          <rect x="281" y="106" width="20" height="3" fill="#A8C08A" />
          <rect x="281" y="112" width="14" height="3" fill="#A8C08A" />
          <rect x="281" y="118" width="10" height="3" fill="#E8B84A" />
          <polygon points="266,168 268,172 272,172 269,175 270,179 266,177 262,179 263,175 260,172 264,172" fill="#E8B84A" stroke="#2B2117" strokeWidth="1" />
          <path d="M 300 172 C 297 169 293 172 293 175 C 293 179 300 184 300 184 C 300 184 307 179 307 175 C 307 172 303 169 300 172 Z" fill="#D96B4F" stroke="#2B2117" strokeWidth="1" />
          <rect x="256" y="200" width="14" height="12" fill="#FBF3DB" stroke="#2B2117" strokeWidth="1" />
          <rect x="256" y="200" width="14" height="3" fill="#7A9968" />
          <line x1="259" y1="207" x2="267" y2="207" stroke="#8A7455" strokeWidth="1" />
          <circle cx="302" cy="215" r="6" fill="#F5D078" stroke="#2B2117" strokeWidth="1" />
          <circle cx="300" cy="213" r="0.8" fill="#2B2117" />
          <circle cx="304" cy="213" r="0.8" fill="#2B2117" />
          <path d="M 299 216 Q 302 218 305 216" stroke="#2B2117" strokeWidth="1" fill="none" />
          <rect x="248" y="246" width="10" height="6" fill="#5A4530" stroke="#2B2117" strokeWidth="1" />
          <rect x="302" y="246" width="10" height="6" fill="#5A4530" stroke="#2B2117" strokeWidth="1" />
        </g>
        <g>
          <polygon points="332,155 340,163 336,164 340,172 336,174 332,166 328,167" fill="#FBF3DB" stroke="#2B2117" strokeWidth="1.5">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur="1s" repeatCount="indefinite" />
          </polygon>
        </g>
        <g>
          <polygon points="150,280 260,280 275,300 135,300" fill="#D96B4F" stroke="#2B2117" strokeWidth="1.5" />
          <polygon points="165,282 245,282 258,297 152,297" fill="none" stroke="#E8B84A" strokeWidth="1" />
        </g>
        <g>
          <ellipse cx="80" cy="280" rx="14" ry="8" fill="#5A7A4B" stroke="#2B2117" strokeWidth="1.5" />
          <rect x="76" y="265" width="8" height="12" fill="#B87A5A" stroke="#2B2117" strokeWidth="1" />
          <rect x="90" y="282" width="20" height="5" fill="#D9A868" stroke="#2B2117" strokeWidth="1" />
          <circle cx="80" cy="280" r="4" fill="#2B2117" />
        </g>
      </svg>
    </section>
  )
}
