import { distance, fingerprint } from './artwork.js'
import { songs } from './itunes.js'
import { artistKey, cleanTitle, norm } from './text.js'

// O oEmbed é a única rota do Spotify que um site de fora consegue ler, e ele dá o título e a
// capa, mas não o artista nem a duração. A capa, porém, é a arte exata do álbum daquela faixa.
// Hasheando a capa do Spotify e as capas dos candidatos do iTunes, a que casa diz de quem é a
// gravação e quanto ela dura — que é o que falta para escolher a versão certa no LRCLIB.

const SEARCH = 25     // quantos resultados pedir ao iTunes
const CANDIDATES = 8  // quantas capas baixar
const MAX = 12        // distância máxima para tratar como a mesma arte
const MARGIN = 6      // vantagem mínima sobre a melhor arte de outro artista

// Medido em 300x300: a arte certa fica a 1 e a próxima, a 20. MAX e MARGIN moram nessa folga.
export async function identify({ title, thumb }, signal) {
  if (!thumb) return null
  const ours = await fingerprint(thumb, signal)
  if (ours === null) return null

  const plain = cleanTitle(title)
  const want = norm(plain)
  const seen = new Set()
  const pool = (await songs(plain, SEARCH, signal))
    .filter(s => {
      const got = norm(cleanTitle(s.track))
      return Boolean(got) && (got === want || want.includes(got) || got.includes(want))
    })
    .filter(s => !seen.has(s.cover) && seen.add(s.cover))
    .slice(0, CANDIDATES)

  const scored = (await Promise.all(pool.map(async s => {
    const bits = await fingerprint(s.cover, signal)
    return bits === null ? null : { ...s, distance: distance(ours, bits) }
  })))
    .filter(Boolean)
    // No empate de distância vale quem trouxe duração; é o campo que a escolha usa depois.
    .sort((a, b) => a.distance - b.distance || (a.duration === null) - (b.duration === null))

  const best = scored[0]
  if (!best || best.distance > MAX) return null
  // Só conta como concorrência a arte de outro artista: a mesma gravação aparece no iTunes em
  // vários álbuns, e duas edições do mesmo artista não deixam a resposta ambígua.
  const key = artistKey(best.artist)
  const rival = scored.find(s => artistKey(s.artist) !== key)
  if (rival && rival.distance - best.distance < MARGIN) return null
  return { artist: best.artist, album: best.album, duration: best.duration, distance: best.distance }
}
