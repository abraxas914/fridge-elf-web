export function FridgeHeroSvg() {
  return (
    <svg
      className="landing-illustration landing-hero-illustration"
      viewBox="0 0 560 620"
      role="img"
      aria-label="冰箱精灵在冰箱旁记录食材"
      shapeRendering="crispEdges"
    >
      <title>冰箱精灵在冰箱旁记录食材</title>
      <desc>
        一台带小屏的冰箱正在记录牛奶、鸡蛋和蔬菜，旁边的数据卡片轻轻浮动。
      </desc>

      <path
        d="M76 556h414"
        fill="none"
        stroke="var(--border)"
        strokeWidth="4"
        strokeDasharray="10 10"
      />
      <path
        d="M102 574h364"
        fill="none"
        stroke="var(--mustard-dk)"
        strokeWidth="3"
      />

      <g className="hero-fridge-float">
        <rect
          x="159"
          y="92"
          width="280"
          height="444"
          rx="26"
          fill="var(--mustard)"
          stroke="var(--border)"
          strokeWidth="5"
          transform="translate(12 12)"
        />
        <rect
          x="151"
          y="84"
          width="280"
          height="444"
          rx="26"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M151 286h280"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          className="hero-screen-pulse"
          x="190"
          y="126"
          width="154"
          height="104"
          rx="4"
          fill="var(--navy-dk)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M226 170h16m50 0h16M247 193c12 12 28 12 40 0"
          fill="none"
          stroke="var(--butter-lt)"
          strokeWidth="6"
          strokeLinecap="square"
        />
        <text
          x="267"
          y="150"
          fill="var(--panel-3)"
          fontFamily="Silkscreen, monospace"
          fontSize="11"
          textAnchor="middle"
        >
          ALL GOOD
        </text>
        <rect
          x="382"
          y="320"
          width="13"
          height="124"
          fill="var(--mustard)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <rect
          x="174"
          y="482"
          width="42"
          height="14"
          fill="var(--navy)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <rect
          x="366"
          y="482"
          width="42"
          height="14"
          fill="var(--navy)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <g transform="translate(184 330)">
          <rect
            width="105"
            height="91"
            fill="var(--sage-lt)"
            stroke="var(--border)"
            strokeWidth="4"
            transform="rotate(-3 52 45)"
          />
          <text
            x="52"
            y="31"
            fill="var(--text)"
            fontFamily="Silkscreen, monospace"
            fontSize="10"
            textAnchor="middle"
          >
            MILK
          </text>
          <text
            x="52"
            y="55"
            fill="var(--text)"
            fontFamily="VT323, monospace"
            fontSize="24"
            textAnchor="middle"
          >
            2 DAYS
          </text>
          <path
            d="M26 71h52"
            fill="none"
            stroke="var(--sage-dk)"
            strokeWidth="4"
          />
        </g>
      </g>

      <g className="hero-food-bob" transform="translate(54 162)">
        <rect
          x="0"
          y="30"
          width="112"
          height="132"
          rx="5"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M0 66h112M24 30V11h64v19"
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <ellipse
          cx="31"
          cy="92"
          rx="16"
          ry="21"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <ellipse
          cx="76"
          cy="92"
          rx="16"
          ry="21"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <ellipse
          cx="53"
          cy="132"
          rx="16"
          ry="21"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="3"
        />
      </g>

      <g className="hero-food-bob" transform="translate(414 170)">
        <path
          d="M19 23h62l-8 126H27z"
          fill="var(--navy-lt)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M27 23L40 0h34l7 23"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M39 61h35M42 83h29"
          fill="none"
          stroke="var(--panel-3)"
          strokeWidth="4"
        />
      </g>

      <g className="hero-data-card" transform="translate(40 397)">
        <rect
          width="130"
          height="86"
          fill="var(--butter-lt)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <text
          x="16"
          y="27"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="9"
        >
          EGGS
        </text>
        <text
          x="16"
          y="62"
          fill="var(--text)"
          fontFamily="VT323, monospace"
          fontSize="34"
        >
          6 LEFT
        </text>
      </g>

      <g className="hero-data-card" transform="translate(424 408)">
        <rect
          width="106"
          height="78"
          fill="var(--peach)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M20 24h66M20 41h46M20 58h56"
          fill="none"
          stroke="var(--border)"
          strokeWidth="4"
        />
      </g>

      <path
        d="M116 120l8 15 15 8-15 8-8 15-8-15-15-8 15-8zM476 102v42m-21-21h42"
        fill="var(--coral)"
        stroke="var(--border)"
        strokeWidth="3"
      />
    </svg>
  )
}
