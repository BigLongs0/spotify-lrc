// Falha esperada, com um código que vira texto em i18n.js (e.<code>).
export class Problem extends Error {
  constructor(code, detail) {
    super(code)
    this.name = 'Problem'
    this.code = code
    this.detail = detail
  }
}

const RETRIES = 2

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    }, { once: true })
  })
}

// `blocked` é o código para quando o fetch falha com a rede de pé. O oEmbed do Spotify
// responde 404 sem cabeçalho CORS, e o navegador só mostra isso como erro de rede.
export async function getJson(url, { signal, headers, source, missing = 'missing', blocked = 'net' } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await fetch(url, { signal, headers, credentials: 'omit', referrerPolicy: 'no-referrer' })
    } catch (e) {
      if (e.name === 'AbortError') throw e
      throw new Problem(navigator.onLine === false ? 'net' : blocked, source)
    }
    // 429 e 503 são o LRCLIB pedindo calma; espera o Retry-After (até 3 s) e tenta de novo.
    if ((res.status === 429 || res.status === 503) && attempt < RETRIES) {
      const wait = Number(res.headers.get('retry-after'))
      await pause(Number.isFinite(wait) && wait > 0 ? Math.min(wait, 3) * 1000 : 800 * (attempt + 1), signal)
      continue
    }
    if (res.status === 404) throw new Problem(missing)
    if (res.status === 429 || res.status === 503) throw new Problem('rate', source)
    if (!res.ok) throw new Problem('api', source)
    try {
      return await res.json()
    } catch (e) {
      if (e.name === 'AbortError') throw e
      throw new Problem('api', source)
    }
  }
}
