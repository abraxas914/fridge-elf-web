const scenes = [
  {
    x: 20,
    label: 'FRIDGE',
    color: 'var(--navy-lt)',
    object: (
      <>
        <rect
          x="72"
          y="76"
          width="118"
          height="210"
          rx="12"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M72 168h118M164 190v56"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
      </>
    ),
  },
  {
    x: 310,
    label: 'WARDROBE',
    color: 'var(--butter-lt)',
    object: (
      <>
        <rect
          x="52"
          y="72"
          width="158"
          height="214"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M131 72v214M89 128h84M95 120l36-25 36 25"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
      </>
    ),
  },
  {
    x: 600,
    label: 'MEDICINE',
    color: 'var(--sage-lt)',
    object: (
      <>
        <rect
          x="54"
          y="86"
          width="154"
          height="200"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M131 126v66M98 159h66M54 216h154"
          fill="none"
          stroke="var(--coral)"
          strokeWidth="8"
        />
      </>
    ),
  },
] as const

export function HomeScenesSvg() {
  return (
    <svg
      className="landing-illustration landing-home-scenes-illustration"
      viewBox="0 0 890 390"
      role="img"
      aria-label="同一个安静的家庭入口可以来到冰箱衣柜和药柜旁"
      shapeRendering="crispEdges"
    >
      <title>同一个安静的家庭入口可以来到冰箱衣柜和药柜旁</title>
      <desc>
        冰箱、衣柜和药柜三个家庭场景中，使用同一种小终端形态理解食材、衣物和药品的流转。
      </desc>

      <path
        d="M150 330h590"
        fill="none"
        stroke="var(--border)"
        strokeWidth="4"
        strokeDasharray="11 10"
      />

      {scenes.map((scene, index) => (
        <g key={scene.label} transform={`translate(${scene.x} 20)`}>
          <rect
            x="8"
            y="8"
            width="260"
            height="320"
            fill="var(--mustard)"
            stroke="var(--border)"
            strokeWidth="5"
          />
          <rect
            width="260"
            height="320"
            fill={scene.color}
            stroke="var(--border)"
            strokeWidth="5"
          />
          {scene.object}
          <g className="scene-beacon" transform="translate(28 192)">
            <rect
              x="6"
              y="6"
              width="66"
              height="78"
              fill="var(--coral)"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <rect
              width="66"
              height="78"
              fill="var(--navy-dk)"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <path
              d="M18 28h30M18 45h22"
              fill="none"
              stroke="var(--butter-lt)"
              strokeWidth="4"
            />
          </g>
          <text
            x="130"
            y="308"
            fill="var(--text)"
            fontFamily="Silkscreen, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            {scene.label}
          </text>
          <text
            x="236"
            y="28"
            fill="var(--text)"
            fontFamily="VT323, monospace"
            fontSize="24"
            textAnchor="middle"
          >
            0{index + 1}
          </text>
        </g>
      ))}
    </svg>
  )
}
