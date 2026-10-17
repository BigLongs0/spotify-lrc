export const $ = id => document.getElementById(id)
export const root = document.documentElement

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v)
  }
  node.append(...children.flat().filter(c => c != null && c !== false))
  return node
}

const SVG = 'http://www.w3.org/2000/svg'

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v)
  node.append(...children)
  return node
}

export function icon(d, size = 14) {
  return svg('svg', {
    viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, svg('path', { d }))
}

export const ICON = {
  down: 'M8 2.5v9M4.5 8 8 11.5 11.5 8M3 13.5h10',
  copy: 'M5.5 5.5v-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M3.5 5.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z',
  check: 'M3 8.5 6.5 12 13 4.5',
  back: 'M13 8H3M7 4 3 8l4 4',
  close: 'M4 4l8 8M12 4l-8 8',
  list: 'M6 4h7.5M6 8h7.5M6 12h7.5M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  refresh: 'M13 3v3.5H9.5M3 13V9.5h3.5M12.6 6.5A5 5 0 0 0 3.8 5M3.4 9.5a5 5 0 0 0 8.8 1.5',
}
