// Normalização compartilhada: o LRCLIB e o iTunes escrevem o mesmo título e o mesmo artista de
// formas diferentes, e os dois lados precisam comparar pelas mesmas regras.

export const norm = s => (s ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const FEAT = /\s*[([](?:feat|ft|with|com|part)\.?\s[^)\]]*[)\]]/gi
const SUFFIX = /\s+[-–—]\s+.*$/

// "Música - Remastered 2011 (feat. X)" vira "Música" para a busca casar com mais entradas.
export function cleanTitle(title) {
  return title.replace(FEAT, '').replace(SUFFIX, '').trim() || title.trim()
}

// "Artista - Topic" é o canal automático do YouTube, de onde muita entrada foi enviada.
export const cleanArtist = name => name.replace(/\s+-\s+topic$/i, '').trim() || name.trim()

// Para comparar só vale o primeiro artista: "A & B", "A, B", "A / B", "A x B" e "A feat. B"
// contam como "A".
export const artistKey = name =>
  norm(cleanArtist(name).split(/\s*(?:&|,|\/|;|\s+x\s+|\s+(?:feat|ft|featuring)\.?\s)\s*/i)[0])

// "artista - música" vira [artista, música]; sem o traço, é só texto livre.
export function splitQuery(q) {
  const m = /^(.+?)\s+[-–—]\s+(.+)$/.exec(q.trim())
  return m ? [m[1].trim(), m[2].trim()] : [null, q.trim()]
}
