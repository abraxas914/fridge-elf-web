export function FridgeShelfSvg() {
  return (
    <svg
      className="landing-illustration landing-shelf-illustration"
      viewBox="0 0 760 520"
      role="img"
      aria-label="食材在冰箱层架中逐渐被遮挡"
      shapeRendering="crispEdges"
    >
      <title>食材在冰箱层架中逐渐被遮挡</title>
      <desc>
        打开的冰箱中，牛奶、鸡蛋和牛肉被后来放入的袋子遮住，四个小标记指出余量、日期、外出确认和临期提醒问题。
      </desc>

      <rect
        x="118"
        y="50"
        width="510"
        height="420"
        rx="22"
        fill="var(--mustard)"
        stroke="var(--border)"
        strokeWidth="5"
        transform="translate(10 10)"
      />
      <rect
        x="110"
        y="42"
        width="510"
        height="420"
        rx="22"
        fill="var(--panel-3)"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <rect
        x="142"
        y="76"
        width="446"
        height="344"
        fill="var(--navy)"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <path
        d="M142 185h446M142 300h446"
        fill="none"
        stroke="var(--panel-3)"
        strokeWidth="6"
      />

      <g transform="translate(176 102)">
        <path
          d="M0 23h62l-8 77H8z"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M8 23L20 0h30l12 23"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <text
          x="31"
          y="63"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          MILK
        </text>
      </g>

      <g transform="translate(300 118)">
        {[0, 48, 96].map((offset) => (
          <ellipse
            key={offset}
            cx={18 + offset}
            cy="37"
            rx="18"
            ry="26"
            fill="var(--panel-3)"
            stroke="var(--border)"
            strokeWidth="4"
          />
        ))}
      </g>

      <g transform="translate(440 98)">
        <path
          d="M16 9c31-17 67 4 75 34 8 31-18 56-51 52C8 91-8 56 4 29z"
          fill="var(--coral)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M15 55c22-16 47-16 70-2"
          fill="none"
          stroke="var(--panel-3)"
          strokeWidth="5"
        />
      </g>

      <g className="shelf-obstruction" transform="translate(226 205)">
        <path
          d="M16 24L48 0h136l30 24-20 89H28z"
          fill="var(--sage-lt)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M57 1l23 112M139 1l-20 112"
          fill="none"
          stroke="var(--sage-dk)"
          strokeWidth="4"
        />
        <circle
          cx="92"
          cy="54"
          r="20"
          fill="var(--butter-lt)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M85 54h14M92 47v14"
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
      </g>

      <g transform="translate(170 329)">
        <rect
          width="150"
          height="66"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M15 20h120M15 43h88"
          fill="none"
          stroke="var(--text-lt)"
          strokeWidth="4"
        />
      </g>
      <g transform="translate(378 326)">
        <circle
          cx="45"
          cy="34"
          r="30"
          fill="var(--peach)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M45 14v23l15 9"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M97 6h68v58H97z"
          fill="var(--butter-lt)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M109 21h44M109 38h34"
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
      </g>

      {[
        { x: 20, y: 92, number: '01', color: 'var(--butter-lt)' },
        { x: 642, y: 128, number: '02', color: 'var(--peach)' },
        { x: 34, y: 332, number: '03', color: 'var(--sage-lt)' },
        { x: 646, y: 354, number: '04', color: 'var(--coral)' },
      ].map((tag) => (
        <g key={tag.number} transform={`translate(${tag.x} ${tag.y})`}>
          <rect
            width="82"
            height="58"
            fill={tag.color}
            stroke="var(--border)"
            strokeWidth="4"
          />
          <text
            x="41"
            y="38"
            fill="var(--text)"
            fontFamily="Silkscreen, monospace"
            fontSize="16"
            textAnchor="middle"
          >
            {tag.number}
          </text>
        </g>
      ))}

      <path
        d="M102 120h52M620 156h27M112 360h46M620 382h28"
        fill="none"
        stroke="var(--border)"
        strokeWidth="4"
        strokeDasharray="8 7"
      />
    </svg>
  )
}
