const pad = n => String(n).padStart(2, '0')

export function clock(sec) {
  const s = Math.round(sec ?? 0)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

function stamp(sec) {
  const s = Math.round(sec ?? 0)
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

const tag = v => String(v).replace(/[[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

// Texto do arquivo: .lrc com cabeçalho quando há tempo, .txt quando só há a letra.
export function file(version) {
  const rec = version.best
  const body = (rec.syncedLyrics || rec.plainLyrics || '').replace(/\r\n?/g, '\n').trim()
  if (!body) return null
  if (!rec.syncedLyrics) return { ext: 'txt', text: `${body}\n` }
  const head = [['ti', rec.trackName], ['ar', rec.artistName], ['al', version.album], ['length', stamp(rec.duration)]]
    .filter(([, v]) => v)
    .map(([k, v]) => `[${k}:${tag(v)}]`)
  return { ext: 'lrc', text: `${head.join('\n')}\n[re:spotify-lrc]\n\n${body}\n` }
}

const TAG = /^\[[a-z]+:.*\]$/i
const TIME = /^((?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\])+)\s?(.*)$/

// Linhas para mostrar, com cabeçalho, tempo e texto separados.
export function lines(text) {
  return text.split('\n').map(l => l.trimEnd()).filter(Boolean).map(l => {
    const time = TIME.exec(l)
    if (time) return { ts: time[1], text: time[2] }
    if (TAG.test(l)) return { tag: l }
    return { text: l }
  })
}

export function fileName(rec, ext) {
  const base = `${rec.artistName} - ${rec.trackName}`
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 150)
  return `${base || 'letra'}.${ext}`
}
