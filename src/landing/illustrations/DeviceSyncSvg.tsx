export function DeviceSyncSvg() {
  return (
    <svg
      className="landing-illustration landing-sync-illustration"
      viewBox="0 0 760 500"
      role="img"
      aria-label="冰箱旁的小屏与手机共享同一份库存"
      shapeRendering="crispEdges"
    >
      <title>冰箱旁的小屏与手机共享同一份库存</title>
      <desc>
        左侧冰箱小屏与右侧手机围绕同一份家庭库存双向更新，数据包在两个入口之间往返。
      </desc>

      <path
        d="M252 250h250"
        fill="none"
        stroke="var(--border)"
        strokeWidth="5"
        strokeDasharray="10 10"
      />
      <path
        d="M270 220h216M486 280H270"
        fill="none"
        stroke="var(--sage-dk)"
        strokeWidth="4"
      />
      <path
        d="M472 205l22 15-22 15M284 265l-22 15 22 15"
        fill="none"
        stroke="var(--sage-dk)"
        strokeWidth="4"
      />

      <g transform="translate(54 70)">
        <rect
          x="8"
          y="8"
          width="206"
          height="340"
          rx="18"
          fill="var(--mustard)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          width="206"
          height="340"
          rx="18"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          x="35"
          y="52"
          width="136"
          height="105"
          fill="var(--navy-dk)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <text
          x="103"
          y="89"
          fill="var(--panel-3)"
          fontFamily="Silkscreen, monospace"
          fontSize="10"
          textAnchor="middle"
        >
          FRIDGE ELF
        </text>
        <text
          x="103"
          y="132"
          fill="var(--butter-lt)"
          fontFamily="VT323, monospace"
          fontSize="34"
          textAnchor="middle"
        >
          12 ITEMS
        </text>
        <path
          d="M35 210h136M35 250h108M35 290h126"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
      </g>

      <g transform="translate(518 56)">
        <rect
          x="8"
          y="8"
          width="174"
          height="368"
          rx="28"
          fill="var(--peach)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          width="174"
          height="368"
          rx="28"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <rect
          x="22"
          y="49"
          width="130"
          height="244"
          fill="var(--panel)"
          stroke="var(--border)"
          strokeWidth="4"
        />
        <path
          d="M65 24h44M72 331h30"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
        {[
          { y: 73, color: 'var(--sage-lt)' },
          { y: 139, color: 'var(--butter-lt)' },
          { y: 205, color: 'var(--peach)' },
        ].map((row) => (
          <g key={row.y}>
            <rect
              x="38"
              y={row.y}
              width="35"
              height="35"
              fill={row.color}
              stroke="var(--border)"
              strokeWidth="3"
            />
            <path
              d={`M86 ${row.y + 9}h48M86 ${row.y + 25}h34`}
              fill="none"
              stroke="var(--border)"
              strokeWidth="3"
            />
          </g>
        ))}
      </g>

      <g transform="translate(308 172)">
        <rect
          width="142"
          height="156"
          fill="var(--sage-lt)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <text
          x="71"
          y="42"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          SHARED
        </text>
        <text
          x="71"
          y="64"
          fill="var(--text)"
          fontFamily="Silkscreen, monospace"
          fontSize="9"
          textAnchor="middle"
        >
          INVENTORY
        </text>
        <path
          d="M30 88h82v42H30zM44 101h54M44 117h34"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="4"
        />
      </g>

      <rect
        className="sync-packet sync-packet-one"
        x="270"
        y="204"
        width="24"
        height="24"
        fill="var(--coral)"
        stroke="var(--border)"
        strokeWidth="3"
      />
      <rect
        className="sync-packet sync-packet-two"
        x="472"
        y="267"
        width="24"
        height="24"
        fill="var(--butter-lt)"
        stroke="var(--border)"
        strokeWidth="3"
      />
    </svg>
  )
}
