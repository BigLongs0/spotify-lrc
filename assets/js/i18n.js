import { root } from './dom.js'

const STR = {
  pt: {
    'theme.light': 'Mudar para o tema claro',
    'theme.dark': 'Mudar para o tema escuro',
    'copy': 'Copiar',
    'copied': 'Copiado',
    'copy.fail': 'Não deu',
    'download': 'Baixar',
    'close': 'Fechar',
    'back': 'Voltar',
    'retry': 'Tentar de novo',
    'versions': n => n === 1 ? '1 versão' : `${n} versões`,
    'copies': n => n === 1 ? '1 cópia no LRCLIB' : `${n} cópias no LRCLIB`,
    'idle': 'Cole um link de faixa do Spotify',
    'busy.meta': 'Lendo a faixa no Spotify',
    'busy.search': 'Procurando no LRCLIB',
    'busy.load': 'Abrindo a letra',
    'lines': n => `${n} linhas sincronizadas`,
    'plain': 'Só tem a letra sem tempo',
    'instrumental': 'Instrumental, sem letra',
    'pick': 'Escolha a versão',
    'synced': 'sincronizada',
    'unsynced': 'sem tempo',
    'instr': 'instrumental',
    'error': 'Erro',
    'e.net': where => `Sem conexão com ${where}.`,
    'e.rate': where => `${where} está ocupado. Tente de novo em alguns segundos.`,
    'e.api': where => `${where} respondeu com erro.`,
    'e.track': 'O Spotify não achou essa faixa.',
    'e.none': 'O LRCLIB não tem letra para essa faixa.',
    'e.missing': 'Essa letra não está mais no LRCLIB.',
    'e.album': 'Esse link é de um álbum. Cole o link de uma faixa.',
    'e.playlist': 'Esse link é de uma playlist. Cole o link de uma faixa.',
    'e.artist': 'Esse link é de um artista. Cole o link de uma faixa.',
    'e.episode': 'Podcast não tem letra. Cole o link de uma faixa.',
    'e.short': 'Links spotify.link não abrem daqui. Abra no navegador e copie o endereço open.spotify.com que aparecer.',
    'e.link': 'Não reconheci esse link. O formato é open.spotify.com/track/…',
  },
  en: {
    'theme.light': 'Switch to the light theme',
    'theme.dark': 'Switch to the dark theme',
    'copy': 'Copy',
    'copied': 'Copied',
    'copy.fail': 'Failed',
    'download': 'Download',
    'close': 'Close',
    'back': 'Back',
    'retry': 'Try again',
    'versions': n => n === 1 ? '1 version' : `${n} versions`,
    'copies': n => n === 1 ? '1 copy on LRCLIB' : `${n} copies on LRCLIB`,
    'idle': 'Paste a Spotify track link',
    'busy.meta': 'Reading the track on Spotify',
    'busy.search': 'Searching LRCLIB',
    'busy.load': 'Opening the lyrics',
    'lines': n => `${n} synced lines`,
    'plain': 'Only unsynced lyrics',
    'instrumental': 'Instrumental, no lyrics',
    'pick': 'Pick a version',
    'synced': 'synced',
    'unsynced': 'unsynced',
    'instr': 'instrumental',
    'error': 'Error',
    'e.net': where => `Could not reach ${where}.`,
    'e.rate': where => `${where} is busy. Try again in a few seconds.`,
    'e.api': where => `${where} returned an error.`,
    'e.track': 'Spotify could not find this track.',
    'e.none': 'LRCLIB has no lyrics for this track.',
    'e.missing': 'These lyrics are no longer on LRCLIB.',
    'e.album': 'That is an album link. Paste a track link.',
    'e.playlist': 'That is a playlist link. Paste a track link.',
    'e.artist': 'That is an artist link. Paste a track link.',
    'e.episode': 'Podcasts have no lyrics. Paste a track link.',
    'e.short': 'spotify.link links do not open from here. Open it in the browser and copy the open.spotify.com address it lands on.',
    'e.link': 'I do not recognize this link. The format is open.spotify.com/track/…',
  },
}

const listeners = []

export let lang = root.lang === 'en' ? 'en' : 'pt'

export function t(key, ...args) {
  const value = STR[lang][key] ?? STR.pt[key]
  return typeof value === 'function' ? value(...args) : value
}

export function store(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function applyStatic() {
  for (const node of document.querySelectorAll('[data-en]')) {
    node.dataset.pt ??= node.textContent
    node.textContent = lang === 'en' ? node.dataset.en : node.dataset.pt
  }
  for (const attr of ['placeholder', 'aria-label']) {
    const name = attr === 'placeholder' ? 'Placeholder' : 'AriaLabel'
    for (const node of document.querySelectorAll(`[data-en-${attr}]`)) {
      node.dataset[`pt${name}`] ??= node.getAttribute(attr)
      node.setAttribute(attr, lang === 'en' ? node.dataset[`en${name}`] : node.dataset[`pt${name}`])
    }
  }
  root.lang = lang === 'en' ? 'en' : 'pt-BR'
}

export function onLang(fn) {
  listeners.push(fn)
}

export function setLang(next) {
  if (next === lang) return
  lang = next
  store('lrc-lang', lang)
  applyStatic()
  for (const fn of listeners) fn()
}
