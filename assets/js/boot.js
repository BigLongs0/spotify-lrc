(function () {
  var root = document.documentElement
  var theme = null
  var lang = null
  try {
    theme = localStorage.getItem('lrc-theme')
    lang = localStorage.getItem('lrc-lang')
  } catch (e) {}
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', '#fcfcfc')
  }
  if (lang !== 'en') return
  root.lang = 'en'
  document.addEventListener('DOMContentLoaded', function () {
    if (!root.classList.contains('ready')) {
      var nodes = document.querySelectorAll('[data-en]')
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = nodes[i].getAttribute('data-en')
    }
    root.classList.add('ready')
  })
})()
