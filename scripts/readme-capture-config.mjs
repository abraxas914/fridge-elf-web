export function resolveBaseUrl(value) {
  return (value?.trim() || 'http://127.0.0.1:4173').replace(
    /\/+$/,
    '',
  )
}

export const captures = [
  {
    name: 'landing-hero',
    route: '/',
    width: 1440,
    height: 900,
    waitFor: '#landing-hero-title',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    name: 'food-lifecycle',
    route: '/#lifecycle',
    width: 1440,
    height: 900,
    waitFor: '#lifecycle-title',
    element: '.landing-lifecycle',
  },
  {
    name: 'mobile-demo',
    route: '/demo',
    width: 412,
    height: 915,
    waitFor: '#app-scene',
    clip: { x: 0, y: 0, width: 412, height: 915 },
  },
]
