const ink = '#2B2117'
const cream = '#F5EAC8'
const light = '#FBF3DB'
const gold = '#E8B84A'
const sage = '#7A9968'
const coral = '#D96B4F'
const blue = '#6B8FB0'
const mid = '#8A7455'

const svg = (body: string) =>
  `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill = cream,
  stroke = ink,
  strokeWidth = 2,
) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`

const dot = (x: number, y: number, fill = ink) =>
  `<rect x="${x}" y="${y}" width="3" height="3" fill="${fill}"/>`

const roof =
  `<polygon points="6,15 16,6 26,15 24,18 16,11 8,18" fill="${coral}" stroke="${ink}" stroke-width="2"/>`

const person = (fill: string) =>
  `${box(11, 6, 10, 9, fill)}${box(8, 16, 16, 11, sage)}${dot(13, 10)}${dot(18, 10)}<rect x="14" y="21" width="4" height="3" fill="${gold}"/>`

export const PIXEL_ICON_SVGS = {
  home: svg(
    `${roof}${box(8, 15, 16, 12, cream)}${box(13, 20, 6, 7, blue)}${dot(10, 17, mid)}${dot(21, 17, mid)}`,
  ),
  family: svg(
    `${person(coral)}<rect x="5" y="17" width="7" height="9" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="20" y="17" width="7" height="9" fill="${cream}" stroke="${ink}" stroke-width="2"/>${dot(7, 20)}${dot(22, 20)}`,
  ),
  roomie: svg(
    `${box(5, 12, 10, 10, cream)}${box(17, 12, 10, 10, cream)}<rect x="13" y="15" width="6" height="3" fill="${gold}" stroke="${ink}" stroke-width="1.5"/>${dot(8, 16)}${dot(22, 16)}`,
  ),
  person: svg(person(coral)),
  'person-a': svg(person(mid)),
  'person-b': svg(person(gold)),
  'person-c': svg(person(blue)),
  kid: svg(
    `${box(12, 8, 8, 8, gold)}${box(9, 17, 14, 9, blue)}${dot(13, 11)}${dot(17, 11)}<rect x="14" y="22" width="4" height="2" fill="${cream}"/>`,
  ),
  plus: svg(
    `<rect x="14" y="7" width="4" height="18" fill="${mid}"/><rect x="7" y="14" width="18" height="4" fill="${mid}"/>`,
  ),
  'pet-cat': svg(
    `${box(8, 12, 16, 12, cream)}<polygon points="8,12 12,7 14,12" fill="${cream}" stroke="${ink}" stroke-width="2"/><polygon points="18,12 22,7 24,12" fill="${cream}" stroke="${ink}" stroke-width="2"/>${dot(12, 17)}${dot(19, 17)}<rect x="15" y="20" width="2" height="2" fill="${ink}"/>`,
  ),
  'pet-dog': svg(
    `${box(8, 13, 16, 11, cream)}${box(5, 14, 5, 7, mid)}${box(22, 14, 5, 7, mid)}${dot(12, 17)}${dot(19, 17)}<rect x="15" y="20" width="3" height="2" fill="${ink}"/>`,
  ),
  'pet-rabbit': svg(
    `${box(9, 14, 14, 10, cream)}${box(10, 5, 4, 10, cream)}${box(18, 5, 4, 10, cream)}${dot(13, 18)}${dot(18, 18)}<rect x="15" y="21" width="2" height="2" fill="${ink}"/>`,
  ),
  spice: svg(
    `<polygon points="10,8 22,18 15,26 7,15" fill="${coral}" stroke="${ink}" stroke-width="2"/><rect x="20" y="6" width="4" height="6" fill="${sage}" stroke="${ink}" stroke-width="1.5"/>${dot(13, 17, cream)}${dot(16, 19, cream)}`,
  ),
  pot: svg(
    `${box(5, 13, 22, 11, cream)}<rect x="8" y="9" width="16" height="4" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="13" y="6" width="6" height="3" fill="${cream}" stroke="${ink}" stroke-width="1.5"/>${dot(8, 16, mid)}${dot(11, 19, mid)}${dot(14, 16, mid)}`,
  ),
  leaf: svg(
    `<polygon points="7,23 22,7 26,7 11,25" fill="${sage}" stroke="${ink}" stroke-width="2"/><rect x="12" y="19" width="10" height="2" fill="${light}"/><rect x="16" y="15" width="7" height="2" fill="${light}"/>`,
  ),
  dumbbell: svg(
    `${box(4, 13, 5, 8, cream)}${box(23, 13, 5, 8, cream)}<rect x="9" y="15" width="14" height="4" fill="${ink}"/><rect x="11" y="12" width="3" height="10" fill="${ink}"/><rect x="18" y="12" width="3" height="10" fill="${ink}"/>`,
  ),
  balance: svg(
    `<rect x="15" y="6" width="3" height="20" fill="${ink}"/><rect x="9" y="8" width="15" height="2" fill="${ink}"/><path d="M 8 11 L 4 20 L 12 20 Z" fill="${cream}" stroke="${ink}" stroke-width="2"/><path d="M 24 11 L 20 20 L 28 20 Z" fill="${cream}" stroke="${ink}" stroke-width="2"/>`,
  ),
  run: svg(
    `<rect x="14" y="7" width="6" height="6" fill="${gold}" stroke="${ink}" stroke-width="2"/><rect x="12" y="14" width="8" height="5" fill="${sage}" stroke="${ink}" stroke-width="2"/><rect x="6" y="19" width="9" height="4" fill="${ink}"/><rect x="18" y="20" width="9" height="4" fill="${ink}"/>`,
  ),
  rice: svg(
    `<ellipse cx="16" cy="18" rx="10" ry="5" fill="${cream}" stroke="${ink}" stroke-width="2"/><path d="M 7 18 L 10 25 L 22 25 L 25 18" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="12" y="15" width="3" height="3" fill="${light}"/><rect x="17" y="14" width="3" height="3" fill="${light}"/>`,
  ),
  clock: svg(
    `<rect x="8" y="7" width="16" height="16" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="15" y="10" width="3" height="7" fill="${ink}"/><rect x="16" y="16" width="6" height="3" fill="${ink}"/><rect x="10" y="24" width="4" height="3" fill="${ink}"/><rect x="19" y="24" width="4" height="3" fill="${ink}"/>`,
  ),
  calendar: svg(
    `${box(7, 8, 18, 17, cream)}<rect x="7" y="8" width="18" height="5" fill="${coral}" stroke="${ink}" stroke-width="2"/><rect x="11" y="5" width="3" height="6" fill="${ink}"/><rect x="19" y="5" width="3" height="6" fill="${ink}"/>${dot(11, 16, mid)}${dot(16, 16, mid)}${dot(21, 16, mid)}${dot(11, 21, mid)}${dot(16, 21, gold)}`,
  ),
  alert: svg(
    `<rect x="14" y="7" width="4" height="13" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="10" y="12" width="12" height="9" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="8" y="22" width="16" height="3" fill="${ink}"/>${dot(14, 25, gold)}`,
  ),
  camera: svg(
    `${box(5, 10, 22, 14, cream)}${box(10, 7, 8, 4, cream)}<rect x="13" y="14" width="7" height="7" fill="${blue}" stroke="${ink}" stroke-width="2"/><rect x="7" y="12" width="3" height="3" fill="${coral}"/>`,
  ),
  moon: svg(
    `<path d="M 21 6 Q 12 8 12 17 Q 12 25 22 26 Q 17 29 10 25 Q 4 21 6 13 Q 8 6 15 4 Z" fill="${cream}" stroke="${ink}" stroke-width="2"/>${dot(21, 11, gold)}${dot(23, 17, gold)}`,
  ),
  bot: svg(
    `${box(7, 11, 18, 13, cream)}<rect x="12" y="7" width="8" height="4" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="15" y="4" width="2" height="4" fill="${ink}"/>${dot(11, 16)}${dot(19, 16)}<rect x="13" y="21" width="6" height="2" fill="${ink}"/>`,
  ),
  mealbox: svg(
    `${box(6, 8, 20, 17, cream)}<rect x="6" y="8" width="20" height="4" fill="${gold}" stroke="${ink}" stroke-width="2"/><rect x="10" y="14" width="5" height="5" fill="${coral}"/><rect x="17" y="14" width="5" height="5" fill="${sage}"/><rect x="10" y="21" width="12" height="2" fill="${ink}"/>`,
  ),
  weather: svg(
    `<rect x="7" y="17" width="17" height="7" fill="${light}" stroke="${ink}" stroke-width="2"/><rect x="12" y="13" width="12" height="7" fill="${light}" stroke="${ink}" stroke-width="2"/><rect x="21" y="7" width="6" height="6" fill="${gold}" stroke="${ink}" stroke-width="2"/>`,
  ),
  apple: svg(
    `<rect x="10" y="11" width="12" height="12" fill="${coral}" stroke="${ink}" stroke-width="2"/><rect x="14" y="8" width="4" height="4" fill="${ink}"/><rect x="18" y="7" width="6" height="4" fill="${sage}" stroke="${ink}" stroke-width="1"/>`,
  ),
  noodle: svg(
    `${box(6, 14, 20, 9, cream)}<rect x="8" y="10" width="16" height="2" fill="${ink}"/><path d="M 10 10 L 12 6 M 16 10 L 18 6 M 22 10 L 24 6" stroke="${ink}" stroke-width="2"/><rect x="11" y="17" width="10" height="2" fill="${mid}"/>`,
  ),
  heart: svg(
    `<path d="M 16 25 L 7 16 Q 4 13 6 9 Q 9 6 13 10 L 16 13 L 19 10 Q 23 6 26 9 Q 28 13 25 16 Z" fill="${coral}" stroke="${ink}" stroke-width="2"/>`,
  ),
  milk: svg(
    `${box(9, 9, 14, 17, cream)}<rect x="12" y="5" width="8" height="5" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="11" y="14" width="10" height="6" fill="${blue}" stroke="${ink}" stroke-width="1.5"/><rect x="13" y="16" width="2" height="2" fill="${cream}"/><rect x="17" y="16" width="2" height="2" fill="${cream}"/>`,
  ),
  box: svg(
    `${box(6, 8, 20, 18, cream)}<rect x="6" y="8" width="20" height="5" fill="${gold}" stroke="${ink}" stroke-width="2"/><rect x="14" y="8" width="4" height="18" fill="${light}"/><rect x="10" y="17" width="12" height="3" fill="${mid}"/>`,
  ),
  mic: svg(
    `${box(12, 5, 8, 15, cream)}<path d="M 7 18 Q 7 26 16 26 Q 25 26 25 18" fill="none" stroke="${ink}" stroke-width="3"/><rect x="14" y="26" width="4" height="4" fill="${ink}"/>`,
  ),
  sound: svg(
    `<rect x="6" y="13" width="6" height="8" fill="${cream}" stroke="${ink}" stroke-width="2"/><polygon points="12,13 20,8 20,26 12,21" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="23" y="11" width="2" height="14" fill="${ink}"/><rect x="27" y="14" width="2" height="8" fill="${ink}"/>`,
  ),
  'sound-off': svg(
    `<rect x="6" y="13" width="6" height="8" fill="${cream}" stroke="${ink}" stroke-width="2"/><polygon points="12,13 20,8 20,26 12,21" fill="${cream}" stroke="${ink}" stroke-width="2"/><rect x="23" y="12" width="3" height="14" fill="${coral}" transform="rotate(45 24 19)"/>`,
  ),
} as const

export type PixelIconName = keyof typeof PIXEL_ICON_SVGS

const svgObjectUrls = new Map<string, string>()

export function svgDataUrl(svgSource: string) {
  const standaloneSvg = svgSource.replace(
    '<svg ',
    '<svg xmlns="http://www.w3.org/2000/svg" ',
  )

  if (
    typeof URL.createObjectURL === 'function' &&
    typeof Blob === 'function'
  ) {
    const existing = svgObjectUrls.get(standaloneSvg)
    if (existing) return existing

    const objectUrl = URL.createObjectURL(
      new Blob([standaloneSvg], { type: 'image/svg+xml;charset=utf-8' }),
    )
    svgObjectUrls.set(standaloneSvg, objectUrl)
    return objectUrl
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneSvg)}`
}

interface PixelIconProps {
  name: PixelIconName
  className?: string
}

export function PixelIcon({ name, className }: PixelIconProps) {
  return (
    <img
      aria-hidden="true"
      className={className}
      draggable={false}
      src={svgDataUrl(PIXEL_ICON_SVGS[name])}
      alt=""
    />
  )
}
