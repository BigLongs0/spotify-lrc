import { getJson } from './net.js'

// O iTunes Search é a base de catálogo que responde cross-origin sem chave e traz artista,
// álbum, duração e capa. Ela não conhece o ID do Spotify; quem liga os dois lados é a capa.
const API = 'https://itunes.apple.com/search'
const SIZE = /\/\d+x\d+bb\.(?:jpg|png)$/

// A capa vem em 100 px. O hash separa melhor quando os dois lados têm o mesmo tamanho, e a do
// Spotify vem em 300.
const cover = url => typeof url === 'string' && SIZE.test(url) ? url.replace(SIZE, '/300x300bb.jpg') : null

function song(r) {
  const art = cover(r?.artworkUrl100)
  if (!art || typeof r.trackName !== 'string' || typeof r.artistName !== 'string') return null
  const album = typeof r.collectionName === 'string' ? r.collectionName.trim() : ''
  return {
    track: r.trackName.trim(),
    artist: r.artistName.trim(),
    album: album || null,
    duration: Number.isFinite(r.trackTimeMillis) ? Math.round(r.trackTimeMillis / 1000) : null,
    cover: art,
  }
}

export async function songs(title, limit, signal) {
  const query = new URLSearchParams({ term: title, entity: 'song', media: 'music', limit: String(limit) })
  const data = await getJson(`${API}?${query}`, { signal, source: 'iTunes' })
  return Array.isArray(data?.results) ? data.results.map(song).filter(Boolean) : []
}
