const pad = n => String(n).padStart(2, '0')

// Duração desconhecida vira texto vazio, para quem mostra poder pular o campo.
export function clock(sec) {
  if (!Number.isFinite(sec)) return ''
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${pad(s % 60)}`
}

function stamp(sec) {
  if (!Number.isFinite(sec)) return null
  const s = Math.round(sec)
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

const tag = v => String(v).replace(/[[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

// Texto do arquivo: .lrc com cabeçalho quando há tempo, .txt quando só há a letra.
export function file(version) {
  const rec = version.best
  const body = (rec.syncedLyrics || rec.plainLyrics || '').replace(/\r\n?/g, '\n').trim()
  if (!body) return null
  if (!rec.syncedLyrics) return { ext: 'txt', text: `${body}\n` }
  const head = [['ti', version.title], ['ar', version.artistName], ['al', version.album], ['length', stamp(version.duration)]]
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

export function fileName(version, ext) {
  const base = `${version.artistName} - ${version.title}`
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 150)
  return `${base || 'letra'}.${ext}`
}
