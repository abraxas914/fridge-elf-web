const inputs = [
  { x: 60, y: 50, label: 'VOICE', mark: ')))', color: 'var(--coral)' },
  { x: 520, y: 50, label: 'VISION', mark: '◉', color: 'var(--navy-lt)' },
  { x: 60, y: 328, label: 'TOUCH', mark: '+', color: 'var(--butter-lt)' },
  { x: 520, y: 328, label: 'TEXT', mark: 'Aa', color: 'var(--sage-lt)' },
] as const

export function MultimodalSvg() {
  return (
    <svg
      className="landing-illustration landing-multimodal-illustration"
      viewBox="0 0 720 500"
      role="img"
      aria-label="语音视觉触摸和文字共同完成食材录入"
      shapeRendering="crispEdges"
    >
      <title>语音视觉触摸和文字共同完成食材录入</title>
      <desc>
        语音、视觉、触摸和文字四个入口围绕一篮刚到家的食材，任何一种方式都可以接住同一次录入。
      </desc>

      <path
        d="M204 113l104 90M516 113l-104 90M204 387l104-92M516 387l-104-92"
        fill="none"
        stroke="var(--border)"
        strokeWidth="4"
        strokeDasharray="9 9"
      />

      {inputs.map((input) => (
        <g key={input.label} transform={`translate(${input.x} ${input.y})`}>
          <rect
            x="7"
            y="7"
            width="140"
            height="112"
            fill="var(--mustard)"
            stroke="var(--border)"
            strokeWidth="4"
          />
          <rect
            width="140"
            height="112"
            fill={input.color}
            stroke="var(--border)"
            strokeWidth="4"
          />
          <text
            x="70"
            y="51"
            fill="var(--text)"
            fontFamily="VT323, monospace"
            fontSize="34"
            textAnchor="middle"
          >
            {input.mark}
          </text>
          <text
            x="70"
            y="87"
            fill="var(--text)"
            fontFamily="Silkscreen, monospace"
            fontSize="11"
            textAnchor="middle"
          >
            {input.label}
          </text>
        </g>
      ))}

      <g transform="translate(265 150)">
        <rect
          x="7"
          y="7"
          width="190"
          height="200"
          fill="var(--coral)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          width="190"
          height="200"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M38 94h114l-12 77H50zM58 94c3-55 71-55 74 0"
          fill="var(--sage-lt)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <ellipse
          cx="76"
          cy="102"
          rx="18"
          ry="25"
          fill="var(--butter-lt)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M112 86c18-30 39-16 29 11"
          fill="none"
          stroke="var(--sage-dk)"
          strokeWidth="6"
        />
        <circle
          cx="133"
          cy="109"
          r="19"
          fill="var(--coral)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <text
          x="95"
          y="38"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="10"
          textAnchor="middle"
        >
          JUST ARRIVED
        </text>
      </g>

      <g transform="translate(512 181)">
        <rect
          width="176"
          height="75"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <text
          x="88"
          y="28"
          fill="var(--coral-dk)"
          fontFamily="Silkscreen, monospace"
          fontSize="8"
          textAnchor="middle"
        >
          AVAILABLE IN DEMO
        </text>
        <text
          x="88"
          y="53"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="8"
          textAnchor="middle"
        >
          STILL IMPROVING
        </text>
      </g>
    </svg>
  )
}
