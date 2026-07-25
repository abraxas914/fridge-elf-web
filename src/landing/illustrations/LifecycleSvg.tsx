const nodes = [
  { x: 122, y: 106, label: '01', color: 'var(--butter-lt)' },
  { x: 352, y: 64, label: '02', color: 'var(--peach)' },
  { x: 588, y: 112, label: '03', color: 'var(--sage-lt)' },
  { x: 598, y: 332, label: '04', color: 'var(--coral)' },
  { x: 354, y: 380, label: '05', color: 'var(--mustard)' },
  { x: 116, y: 326, label: '06', color: 'var(--navy-lt)' },
] as const

export function LifecycleSvg() {
  return (
    <svg
      className="landing-illustration landing-lifecycle-illustration"
      viewBox="0 0 720 440"
      role="img"
      aria-label="食材从购买到再次入库的六步循环"
      shapeRendering="crispEdges"
    >
      <title>食材从购买到再次入库的六步循环</title>
      <desc>
        六个阶段沿闭环依次连接，中央的一颗鸡蛋从进入家庭到做成一餐，再回到采购与入库。
      </desc>
      <path
        className="lifecycle-path"
        d="M122 106C216 40 264 50 352 64c111-14 165 1 236 48 79 69 82 150 10 220-74 63-152 64-244 48-100 18-177 7-238-54-68-70-66-151 6-220z"
        fill="none"
        stroke="var(--border)"
        strokeWidth="5"
        strokeDasharray="10 9"
      />
      <path
        className="lifecycle-path-accent"
        d="M183 77l20-3-8 18M533 75l18 9-18 8M650 244l-4 20-14-13M464 384l-18 10 4-18M182 369l-19-8 15-11M78 191l5-19 13 14"
        fill="none"
        stroke="var(--coral)"
        strokeWidth="5"
      />

      {nodes.map((node, index) => (
        <g
          className="lifecycle-node"
          style={{ '--node-index': index } as React.CSSProperties}
          key={node.label}
          transform={`translate(${node.x} ${node.y})`}
        >
          <rect
            x="-36"
            y="-36"
            width="72"
            height="72"
            fill={node.color}
            stroke="var(--border)"
            strokeWidth="5"
          />
          <text
            y="8"
            fill="var(--text)"
            fontFamily="Silkscreen, monospace"
            fontSize="19"
            textAnchor="middle"
          >
            {node.label}
          </text>
        </g>
      ))}

      <g transform="translate(270 146)">
        <rect
          width="180"
          height="150"
          fill="var(--panel-3)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <ellipse
          cx="89"
          cy="71"
          rx="43"
          ry="56"
          fill="var(--butter-lt)"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <path
          d="M72 69h9m18 0h9M82 88c8 6 15 6 23 0"
          fill="none"
          stroke="var(--border)"
          strokeWidth="5"
        />
        <text
          x="90"
          y="133"
          fill="var(--text-mid)"
          fontFamily="Silkscreen, monospace"
          fontSize="10"
          textAnchor="middle"
        >
          ONE CONTINUOUS STORY
        </text>
      </g>
    </svg>
  )
}
