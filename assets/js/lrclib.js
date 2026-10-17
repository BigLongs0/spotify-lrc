import { getJson, Problem } from './net.js'

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

const FEAT = /\s*[([](?:feat|ft|with|com|part)\.?\s[^)\]]*[)\]]/gi
const SUFFIX = /\s+[-–—]\s+.*$/

// "Música - Remastered 2011 (feat. X)" vira "Música" para a busca casar com mais entradas.
export function cleanTitle(title) {
  return title.replace(FEAT, '').replace(SUFFIX, '').trim() || title.trim()
}

// "Artista - Topic" é o canal automático do YouTube, de onde muita entrada foi enviada.
const cleanArtist = name => name.replace(/\s+-\s+topic$/i, '').trim() || name.trim()

// Para agrupar só vale o primeiro artista: "A & B", "A, B", "A / B", "A x B" e "A feat. B" contam como "A".
const artistKey = name => norm(cleanArtist(name).split(/\s*(?:&|,|\/|;|\s+x\s+|\s+(?:feat|ft|featuring)\.?\s)\s*/i)[0])

export const norm = s => (s ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// "artista - música" vira [artista, música]; sem o traço, é só texto livre.
export function splitQuery(q) {
  const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(q.trim())
  return m ? [m[1].trim(), m[2].trim()] : [null, q.trim()]
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

// Cada versão já sai com título, artista, álbum e duração resolvidos; quem mostra ou salva usa
// esses campos, não os da entrada crua.
export function versions(records, title) {
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
    v.score = match + v.synced * 3 + withText.length + entries.length
    return v
  })
  // Versão sem letra não vira arquivo; só aparece quando nenhuma outra tem.
  const useful = out.some(v => v.hasText) ? out.filter(v => v.hasText) : out
  return useful.sort((a, b) => b.score - a.score)
}
