// dHash de 64 bits: a imagem cai para 9x8 em tons de cinza e cada bit diz se um pixel é mais
// claro que o vizinho da direita. Isso sobrevive a reescala e a recompressão, que é a diferença
// entre a mesma capa servida pelo Spotify e pelo iTunes.
const W = 9
const H = 8

function load(url, signal) {
  return new Promise(resolve => {
    if (signal?.aborted) return resolve(null)
    const img = new Image()
    // Sem crossOrigin a leitura do canvas é bloqueada, e sem ela não há impressão.
    img.crossOrigin = 'anonymous'
    const done = ok => {
      img.onload = null
      img.onerror = null
      signal?.removeEventListener('abort', abort)
      resolve(ok ? img : null)
    }
    const abort = () => {
      img.src = ''
      done(false)
    }
    signal?.addEventListener('abort', abort, { once: true })
    img.onload = () => done(true)
    img.onerror = () => done(false)
    img.src = url
  })
}

// Devolve null quando a imagem não carrega ou quando o canvas fica marcado: a capa não dá
// impressão, e quem chama trata isso como desconhecido, não como diferente.
export async function fingerprint(url, signal) {
  const img = await load(url, signal)
  if (!img?.naturalWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, W, H)
  let data
  try {
    data = ctx.getImageData(0, 0, W, H).data
  } catch {
    return null
  }
  const grey = []
  for (let i = 0; i < W * H; i++) {
    grey.push(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])
  }
  let bits = 0n
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) bits = (bits << 1n) | (grey[y * W + x] > grey[y * W + x + 1] ? 1n : 0n)
  }
  return bits
}

export function distance(a, b) {
  let diff = a ^ b
  let n = 0
  while (diff) {
    n += Number(diff & 1n)
    diff >>= 1n
  }
  return n
}
