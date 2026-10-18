import { getJson, Problem } from './net.js'
import { artistKey, cleanArtist, cleanTitle, norm } from './text.js'

const API = 'https://lrclib.net/api'
const HEADERS = { 'Lrclib-Client': 'spotify-lrc (https://github.com/BigLongs0/spotify-lrc)' }

// Algumas entradas vêm sem duração; elas ficam, com a duração desconhecida.
function valid(r) {
  return r && Number.isInteger(r.id) && typeof r.trackName === 'string' && typeof r.artistName === 'string'
    && (r.duration == null || Number.isFinite(r.duration))
}

export async function search(params, signal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
  const data = await getJson(`${API}/search?${query}`, { signal, headers: HEADERS, source: 'LRCLIB' })
  if (!Array.isArray(data)) throw new Problem('api', 'LRCLIB')
  return data.filter(valid)
}

export async function byId(id, signal) {
  const data = await getJson(`${API}/get/${id}`, { signal, headers: HEADERS, source: 'LRCLIB' })
  if (!valid(data)) throw new Problem('api', 'LRCLIB')
  return data
}

const lyricsOf = r => (r.syncedLyrics || r.plainLyrics || '').trim()
const known = d => Number.isFinite(d)

// O valor mais repetido; no empate, o que apareceu primeiro.
function mode(values) {
  const counts = new Map()
  let best = null
  let top = 0
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1
    counts.set(v, n)
    if (n > top) {
      best = v
      top = n
    }
  }
  return best
}

// Muita cópia vem com o nome de uma coletânea, de uma playlist ou com "unknown" no lugar do álbum.
// Com várias cópias, o álbum só entra quando duas concordam; com uma só, vale o dela.
const NO_ALBUM = new Set(['none', 'null', 'unknown', 'undefined'])

function albumOf(entries) {
  const names = entries.map(r => r.albumName?.trim()).filter(a => a && !NO_ALBUM.has(a.toLowerCase()))
  const album = mode(names)
  if (!album) return null
  return entries.length === 1 || names.filter(a => a === album).length > 1 ? album : null
}

// A mesma gravação aparece várias vezes no LRCLIB, e a duração cadastrada varia muito entre as
// cópias. Uma entrada entra num grupo do mesmo artista quando tem a mesma letra de alguma cópia
// dele ou duração até 2 s de alguma cópia.
function cluster(records) {
  const groups = []
  for (const r of records) {
    const artist = artistKey(r.artistName)
    const text = lyricsOf(r)
    const g = groups.find(g => g.artist === artist && (
      (text && g.texts.has(text))
      || (known(r.duration) && g.entries.some(e => known(e.duration) && Math.abs(e.duration - r.duration) <= 2))))
    if (g) {
      g.entries.push(r)
      if (text) g.texts.add(text)
    } else {
      groups.push({ artist, texts: new Set(text ? [text] : []), entries: [r] })
    }
  }
  return groups
}

// Quando a capa identificou a gravação, o artista e a duração dela pesam mais que a contagem de
// cópias: é o que resolve um título com muitos covers, onde o mais popular no LRCLIB costuma não
// ser o que foi colado.
const ARTIST = 800
const CLOSE = 400
const NEAR = 150

function bonus(v, hint) {
  if (!hint) return 0
  let n = 0
  if (hint.artist && artistKey(v.artistName) === artistKey(hint.artist)) n += ARTIST
  if (known(hint.duration) && known(v.duration)) {
    const off = Math.abs(v.duration - hint.duration)
    if (off <= 3) n += CLOSE
    else if (off <= 8) n += NEAR
  }
  return n
}

// Cada versão já sai com título, artista, álbum e duração resolvidos; quem mostra ou salva usa
// esses campos, não os da entrada crua. `hint` é o resultado da identificação pela capa, quando
// houve: só muda a ordem, nunca o conteúdo das versões.
export function versions(records, title, hint = null) {
  const want = norm(cleanTitle(title))
  const out = cluster(records).map(({ entries }) => {
    const synced = entries.filter(r => r.syncedLyrics)
    const withText = entries.filter(lyricsOf)
    const pool = synced.length ? synced : withText.length ? withText : entries
    const best = pool.find(r => lyricsOf(r) === mode(pool.map(lyricsOf)))
    const same = entries.filter(r => lyricsOf(r) === lyricsOf(best))
    const v = {
      best,
      entries,
      synced: synced.length,
      hasText: withText.length > 0,
      title: mode(entries.map(r => r.trackName.trim())),
      artistName: mode(entries.map(r => cleanArtist(r.artistName))),
      album: albumOf(entries),
      duration: mode(same.map(r => r.duration).filter(known).map(Math.round))
        ?? mode(entries.map(r => r.duration).filter(known).map(Math.round)),
    }
    const got = norm(cleanTitle(v.title))
    const match = got === want ? 1000 : got && want.includes(got) ? 500 : 0
    v.score = match + bonus(v, hint) + v.synced * 3 + withText.length + entries.length
    return v
  })
  // Versão sem letra não vira arquivo; só aparece quando nenhuma outra tem.
  const useful = out.some(v => v.hasText) ? out.filter(v => v.hasText) : out
  return useful.sort((a, b) => b.score - a.score)
}
