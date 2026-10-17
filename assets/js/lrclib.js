import { getJson, Problem } from './net.js'

const API = 'https://lrclib.net/api'
const HEADERS = { 'Lrclib-Client': 'spotify-lrc (https://github.com/BigLongs0/spotify-lrc)' }

function valid(r) {
  return r && Number.isInteger(r.id) && typeof r.trackName === 'string' && typeof r.artistName === 'string'
    && Number.isFinite(r.duration)
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

export const norm = s => (s ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

// "artista - música" vira [artista, música]; sem o traço, é só texto livre.
export function splitQuery(q) {
  const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(q.trim())
  return m ? [m[1].trim(), m[2].trim()] : [null, q.trim()]
}

const lyricsOf = r => r.syncedLyrics || r.plainLyrics || ''

// A letra que mais se repete entre as cópias costuma ser a versão certa.
function consensus(entries) {
  const counts = new Map()
  for (const r of entries) counts.set(lyricsOf(r), (counts.get(lyricsOf(r)) ?? 0) + 1)
  let best = entries[0]
  let top = 0
  for (const r of entries) {
    const n = counts.get(lyricsOf(r))
    if (n > top) {
      best = r
      top = n
    }
  }
  return best
}

// Muita cópia no LRCLIB vem com o nome de uma coletânea ou playlist no lugar do álbum.
// Com várias cópias, o álbum só entra quando duas concordam; com uma só, vale o dela.
function albumOf(entries) {
  const counts = new Map()
  for (const r of entries) {
    const a = r.albumName?.trim()
    if (a && a !== 'None') counts.set(a, (counts.get(a) ?? 0) + 1)
  }
  let album = null
  let top = entries.length === 1 ? 0 : 1
  for (const [a, n] of counts) {
    if (n > top) {
      album = a
      top = n
    }
  }
  return album
}

// Junta as cópias da mesma gravação: mesmo artista e duração até 2 s de diferença.
export function versions(records, title) {
  const want = norm(cleanTitle(title))
  const out = []
  for (const r of records) {
    const artist = norm(r.artistName)
    let v = out.find(v => v.artist === artist && Math.abs(v.duration - r.duration) <= 2)
    if (!v) out.push(v = { artist, duration: r.duration, entries: [] })
    v.entries.push(r)
  }
  for (const v of out) {
    const synced = v.entries.filter(r => r.syncedLyrics)
    const plain = v.entries.filter(lyricsOf)
    v.synced = synced.length
    v.best = consensus(synced.length ? synced : plain.length ? plain : v.entries)
    v.album = albumOf(v.entries)
    v.duration = v.best.duration
    const got = norm(cleanTitle(v.best.trackName))
    const match = got === want ? 1000 : got && want.includes(got) ? 500 : 0
    v.score = match + v.synced * 3 + plain.length + v.entries.length
  }
  return out.sort((a, b) => b.score - a.score)
}
