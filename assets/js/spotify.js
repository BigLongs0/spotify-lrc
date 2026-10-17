import { getJson, Problem } from './net.js'

const ID = /^[A-Za-z0-9]{22}$/

function parseUrl(text) {
  const s = /^(open\.)?spotify\.com\//i.test(text) ? `https://${text}` : text
  try {
    const url = new URL(s)
    return /^https?:$/.test(url.protocol) ? url : null
  } catch {
    return null
  }
}

const isSpotify = host => /(^|\.)spotify\.com$/i.test(host)

// Aceita open.spotify.com/(intl-xx/)track/ID, spotify:track:ID e o ID puro.
export function trackId(text) {
  const s = text.trim()
  if (ID.test(s)) return s
  const uri = /^spotify:track:([A-Za-z0-9]{22})$/.exec(s)
  if (uri) return uri[1]
  const url = parseUrl(s)
  if (!url || !isSpotify(url.hostname)) return null
  return /\/track\/([A-Za-z0-9]{22})(?:\/|$)/.exec(url.pathname)?.[1] ?? null
}

// Para links que não são de faixa: diz o que são, para a mensagem de erro.
export function linkKind(text) {
  const s = text.trim()
  const uri = /^spotify:(album|playlist|artist|episode|show|user):/.exec(s)
  if (uri) return kind(uri[1])
  const url = parseUrl(s)
  if (!url) return null
  if (/^(spotify\.link|spotify\.app\.link)$/i.test(url.hostname)) return 'short'
  if (!isSpotify(url.hostname)) return 'link'
  return kind(/\/(album|playlist|artist|episode|show)\//.exec(url.pathname)?.[1])
}

function kind(name) {
  if (name === 'show') return 'episode'
  return ['album', 'playlist', 'artist', 'episode'].includes(name) ? name : 'link'
}

// O oEmbed é a única rota do Spotify com CORS aberto. Ele dá o título e a capa, mas não o artista.
export async function track(id, signal) {
  const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`
  const data = await getJson(url, { signal, source: 'Spotify', missing: 'track', blocked: 'track' })
  if (typeof data?.title !== 'string' || !data.title.trim()) throw new Problem('track')
  const thumb = typeof data.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://') ? data.thumbnail_url : null
  return { id, title: data.title.trim(), thumb }
}
