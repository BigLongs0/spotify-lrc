import { chrome } from './chrome.js'
import { $, el, icon, ICON, root } from './dom.js'
import { onLang, read, store, t } from './i18n.js'
import { clock, file, fileName, lines } from './lrc.js'
import { byId, cleanTitle, search, splitQuery, versions } from './lrclib.js'
import { Problem } from './net.js'
import { linkKind, track, trackId } from './spotify.js'

const stage = $('stage')
const lead = $('lead')
const side = $('side')
const cover = $('cover')
const expand = $('expand')
const rows = [...$('lines').children]
const picks = $('picks')
const code = $('code')
const reason = $('reason')
const statusEl = $('status')
const live = $('live')
const actions = $('actions')
const form = $('link')
const input = $('link-url')
const go = $('link-go')
const recentBox = $('recent')
const recentList = $('recent-list')
const viewer = $('viewer')
const viewerName = $('viewer-name')
const viewerMeta = $('viewer-meta')
const viewerActions = $('viewer-actions')
const viewerBody = $('viewer-body')
const viewerCode = $('viewer-code')

const PREVIEW = 14
const RECENT = 'lrc-recent'
const RECENT_MAX = 8

let view = { name: 'idle' }
let found = { title: '', thumb: null, versions: [] }
let running = null

function say(text, bad = false) {
  statusEl.classList.toggle('bad', bad)
  statusEl.textContent = text
  live.textContent = text
}

function resolve(count) {
  rows.forEach((row, i) => row.classList.toggle('on', i < count))
}

function btn(label, path, onclick, primary = false) {
  return el('button', { type: 'button', class: primary ? 'btn primary' : 'btn', onclick }, icon(path), label)
}

function copyButton(text) {
  const node = btn(t('copy'), ICON.copy, async () => {
    let ok = true
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      ok = false
    }
    node.replaceChildren(icon(ok ? ICON.check : ICON.close), t(ok ? 'copied' : 'copy.fail'))
    clearTimeout(node.timer)
    node.timer = setTimeout(() => node.replaceChildren(icon(ICON.copy), t('copy')), 1400)
  })
  return node
}

function save(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const a = el('a', { href: url, download: name, hidden: true })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileActions(v, out) {
  return [
    copyButton(out.text),
    btn(`${t('download')} .${out.ext}`, ICON.down, () => save(fileName(v.best, out.ext), out.text), true),
  ]
}

function line(l, i, animate) {
  let node
  if (l.tag) node = el('span', { class: 'ln' }, el('span', { class: 'tag' }, l.tag))
  else node = el('span', { class: 'ln' }, l.ts ? el('span', { class: 'ts' }, l.ts) : null, l.text || el('span', { class: 'gap' }, '♪'))
  if (animate) node.style.animationDelay = `${i * 30}ms`
  return node
}

function problem(e) {
  return e instanceof Problem ? t(`e.${e.code}`, e.detail) : String(e?.message ?? e)
}

// Redesenha o palco a partir de `view`. Também roda quando o idioma muda.
function paint() {
  cover.hidden = !found.thumb || view.name === 'idle'
  expand.hidden = view.name !== 'done' || !view.out
  side.textContent = ''
  actions.replaceChildren()
  switch (view.name) {
    case 'idle':
      lead.textContent = t('idle')
      say('')
      break
    case 'busy':
      lead.textContent = view.label || t('idle')
      say(t(view.step))
      break
    case 'pick':
      lead.textContent = found.title
      side.textContent = t('versions', found.versions.length)
      say(t('pick'))
      renderPicks()
      if (view.from) actions.append(btn(t('back'), ICON.back, () => show(view.from)))
      break
    case 'done': {
      const { version: v, out } = view
      lead.textContent = v.best.trackName
      side.textContent = `${v.best.artistName} · ${clock(v.best.duration)}`
      say(!out ? t('instrumental') : out.ext === 'lrc' ? t('lines', lines(v.best.syncedLyrics).filter(l => l.ts).length) : t('plain'))
      if (found.versions.length > 1) actions.append(btn(t('versions', found.versions.length), ICON.list, openPick))
      if (out) actions.append(...fileActions(v, out))
      break
    }
    case 'error':
      lead.textContent = found.title || view.label || t('idle')
      reason.textContent = problem(view.error)
      say(t('error'), true)
      if (view.retry) actions.append(btn(t('retry'), ICON.refresh, view.retry))
      break
  }
}

function enter(next) {
  view = next
  stage.dataset.state = next.name
  paint()
}

function busy(label, step, lit) {
  resolve(lit)
  enter({ name: 'busy', label, step })
}

function fail(error, retry) {
  resolve(0)
  enter({ name: 'error', error, retry })
}

function show(v) {
  const out = file(v)
  const shown = out ? lines(out.text) : []
  code.replaceChildren(...shown.slice(0, PREVIEW).map((l, i) => line(l, i, true)))
  code.classList.toggle('open', Boolean(out))
  if (out) remember(v)
  resolve(0)
  enter({ name: 'done', version: v, out })
}

function renderPicks() {
  const from = view.from
  picks.replaceChildren(...found.versions.map(v => {
    const rec = v.best
    const kind = v.synced ? t('synced') : rec.plainLyrics ? t('unsynced') : t('instr')
    const other = rec.trackName !== found.title ? rec.trackName : v.album
    return el('button', {
      type: 'button', class: 'item', 'aria-current': String(v === from), title: t('copies', v.entries.length),
      onclick: () => show(v),
    },
    el('span', { class: 't' }, rec.artistName),
    other ? el('span', { class: 'by' }, other) : null,
    el('span', { class: 'leader' }),
    el('span', { class: 'meta' }, el('span', { class: 'dim' }, kind), clock(v.duration)))
  }))
}

function openPick() {
  enter({ name: 'pick', from: view.name === 'done' ? view.version : null })
  picks.querySelector('[aria-current="true"]')?.focus({ preventScroll: true })
}

function begin() {
  running?.abort()
  running = new AbortController()
  closeViewer()
  return running.signal
}

async function find(text) {
  const query = text.trim()
  if (!query) return
  const id = trackId(query)
  const kind = id ? null : linkKind(query)
  const signal = begin()
  found = { title: '', thumb: null, versions: [] }
  const retry = () => find(query)
  if (kind) {
    shake()
    return fail(new Problem(kind))
  }
  try {
    let artist = null
    let title
    if (id) {
      busy('', 'busy.meta', 4)
      const meta = await track(id, signal)
      title = meta.title
      found.thumb = meta.thumb
      if (meta.thumb) cover.src = meta.thumb
    } else {
      ;[artist, title] = splitQuery(query)
    }
    found.title = title
    busy(title, 'busy.search', 10)

    // Primeiro a busca por campo; se vier vazia, a busca livre, que tolera mais diferença de grafia.
    const plain = cleanTitle(title)
    const first = artist ? { track_name: plain, artist_name: artist } : id ? { track_name: plain } : { q: title }
    const loose = { q: artist ? `${artist} ${plain}` : plain }
    let records = await search(first, signal)
    if (!records.length && loose.q !== first.q) records = await search(loose, signal)

    found.versions = versions(records, title)
    if (!found.versions.length) throw new Problem('none')
    history.replaceState(null, '', id ? `?track=${id}` : location.pathname)
    show(found.versions.find(v => v.synced) ?? found.versions.find(v => v.best.plainLyrics) ?? found.versions[0])
  } catch (e) {
    if (signal.aborted || e?.name === 'AbortError') return
    fail(e, retry)
  }
}

async function open(saved) {
  const signal = begin()
  found = { title: saved.title, thumb: null, versions: [] }
  busy(saved.title, 'busy.load', 10)
  try {
    const rec = await byId(saved.id, signal)
    found.versions = versions([rec], rec.trackName)
    history.replaceState(null, '', location.pathname)
    show(found.versions[0])
  } catch (e) {
    if (signal.aborted || e?.name === 'AbortError') return
    if (e instanceof Problem && e.code === 'missing') forget(saved.id)
    fail(e, () => open(saved))
  }
}

function shake() {
  form.classList.remove('shake')
  void form.offsetWidth
  form.classList.add('shake')
}

// Recentes ficam só neste navegador.
function recent() {
  try {
    const list = JSON.parse(read(RECENT) ?? '[]')
    return Array.isArray(list)
      ? list.filter(r => r && Number.isInteger(r.id) && typeof r.title === 'string' && typeof r.artist === 'string')
      : []
  } catch {
    return []
  }
}

function keep(list) {
  store(RECENT, JSON.stringify(list))
  renderRecent(list)
}

function remember(v) {
  const rec = v.best
  const entry = { id: rec.id, title: rec.trackName, artist: rec.artistName, duration: rec.duration }
  keep([entry, ...recent().filter(r => r.id !== rec.id)].slice(0, RECENT_MAX))
}

function forget(id) {
  keep(recent().filter(r => r.id !== id))
}

function renderRecent(list = recent()) {
  recentBox.hidden = !list.length
  recentList.replaceChildren(...list.map(r => el('button', { type: 'button', class: 'item', onclick: () => open(r) },
    el('span', { class: 't' }, r.title),
    el('span', { class: 'by' }, r.artist),
    el('span', { class: 'leader' }),
    el('span', { class: 'meta' }, clock(r.duration)))))
}

function openViewer() {
  if (view.name !== 'done' || !view.out) return
  const { version: v, out } = view
  viewerName.textContent = v.best.trackName
  viewerMeta.textContent = side.textContent
  viewerCode.replaceChildren(...lines(out.text).map(l => line(l, 0, false)))
  viewerActions.replaceChildren(...fileActions(v, out), el('button', {
    type: 'button', class: 'icon', 'aria-label': t('close'), onclick: closeViewer,
  }, icon(ICON.close, 16)))
  viewer.hidden = false
  root.classList.add('viewing')
  viewerBody.scrollTop = 0
  viewerBody.focus()
}

function closeViewer() {
  if (viewer.hidden) return
  viewer.hidden = true
  root.classList.remove('viewing')
  expand.focus({ preventScroll: true })
}

chrome()
paint()
renderRecent()

form.addEventListener('submit', e => {
  e.preventDefault()
  find(input.value)
})
input.addEventListener('input', () => {
  go.disabled = !input.value.trim()
})
// Colar um link de faixa já busca, no campo ou em qualquer lugar da página.
document.addEventListener('paste', e => {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!trackId(text)) return
  if (e.target !== input) {
    if (e.target.closest?.('input, textarea, [contenteditable]')) return
    e.preventDefault()
  }
  setTimeout(() => {
    if (e.target !== input) input.value = text.trim()
    go.disabled = false
    find(input.value)
  })
})
$('recent-clear').addEventListener('click', () => keep([]))
expand.addEventListener('click', openViewer)
code.addEventListener('click', openViewer)
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeViewer()
})
onLang(() => {
  paint()
  renderRecent()
  if (!viewer.hidden) openViewer()
})

const start = new URLSearchParams(location.search).get('track')
if (start && trackId(start)) {
  input.value = `https://open.spotify.com/track/${trackId(start)}`
  go.disabled = false
  find(input.value)
}
