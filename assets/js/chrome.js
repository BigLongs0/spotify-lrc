import { $, el, root } from './dom.js'
import { applyStatic, lang, onLang, setLang, store, t } from './i18n.js'

function paintToggles() {
  for (const node of $('lang').children) node.setAttribute('aria-pressed', String(node.dataset.lang === lang))
  $('theme').setAttribute('aria-label', t(root.dataset.theme === 'light' ? 'theme.dark' : 'theme.light'))
}

function setTheme(light) {
  if (light) root.dataset.theme = 'light'
  else delete root.dataset.theme
  store('lrc-theme', light ? 'light' : 'dark')
  document.querySelector('meta[name="theme-color"]').content = light ? '#fcfcfc' : '#111111'
  const [moon, sun] = $('theme').children
  moon.classList.toggle('off', light)
  sun.classList.toggle('off', !light)
  paintToggles()
}

// Cabeçalho: nome animado, PT/EN e tema. Deixa a página visível no fim.
export function chrome() {
  const name = $('name')
  const letters = [...name.textContent]
  name.replaceChildren(...letters.map((letter, i) => {
    const span = el('span', { class: 'letter', 'aria-hidden': 'true' }, letter)
    span.style.animationDelay = `${60 + i * 20}ms`
    return span
  }))
  name.setAttribute('aria-label', letters.join(''))

  if (root.dataset.theme === 'light') {
    const [moon, sun] = $('theme').children
    moon.classList.add('off')
    sun.classList.remove('off')
  }

  $('lang').addEventListener('click', e => {
    const next = e.target.closest('button')?.dataset.lang
    if (next) setLang(next)
  })
  $('theme').addEventListener('click', () => setTheme(root.dataset.theme !== 'light'))

  applyStatic()
  paintToggles()
  onLang(paintToggles)
  root.classList.add('ready')
}
