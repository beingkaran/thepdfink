/*
 * Lightweight cookie-consent gate for thepdf.ink content pages.
 *
 * Google AdSense (and its cookies) will NOT load until the visitor accepts. This
 * satisfies the "ask before non-essential cookies" promise in the Privacy Policy
 * and the consent requirement for advertising in the EEA/UK.
 *
 * GO-LIVE: set your AdSense publisher id below (also in each page's <ins> unit).
 */
(function () {
  var ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'
  var KEY = 'tpi-consent'

  function loadAds() {
    if (window.__tpiAdsLoaded) return
    window.__tpiAdsLoaded = true
    var s = document.createElement('script')
    s.async = true
    s.crossOrigin = 'anonymous'
    s.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
      encodeURIComponent(ADSENSE_CLIENT)
    document.head.appendChild(s)
    // Render any ad units already on the page.
    document.querySelectorAll('ins.adsbygoogle').forEach(function () {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch {
        /* no-op */
      }
    })
  }

  function save(value) {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* private mode */
    }
  }

  function dismiss(banner, value) {
    save(value)
    if (value === 'granted') loadAds()
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner)
  }

  function showBanner() {
    var bar = document.createElement('div')
    bar.setAttribute('role', 'dialog')
    bar.setAttribute('aria-label', 'Cookie consent')
    bar.style.cssText =
      'position:fixed;left:16px;right:16px;bottom:16px;max-width:720px;margin:0 auto;' +
      'background:#0f1622;color:#eef2f8;border-radius:12px;padding:16px 18px;z-index:9999;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.35);font:14px/1.5 system-ui,sans-serif;' +
      'display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between'

    var msg = document.createElement('span')
    msg.style.cssText = 'flex:1;min-width:240px'
    msg.innerHTML =
      'We use cookies for advertising on our content pages. The PDF tools never track you. ' +
      'See our <a href="/privacy" style="color:#7fc4e6">Privacy Policy</a>.'

    var actions = document.createElement('span')
    actions.style.cssText = 'display:flex;gap:8px;flex-shrink:0'

    var decline = document.createElement('button')
    decline.textContent = 'Decline'
    decline.style.cssText =
      'background:transparent;color:#cdd7e6;border:1px solid rgba(255,255,255,.25);' +
      'border-radius:8px;padding:9px 16px;font-weight:600;cursor:pointer'
    decline.onclick = function () {
      dismiss(bar, 'denied')
    }

    var accept = document.createElement('button')
    accept.textContent = 'Accept'
    accept.style.cssText =
      'background:#2b7ba6;color:#fff;border:none;border-radius:8px;padding:9px 18px;' +
      'font-weight:600;cursor:pointer'
    accept.onclick = function () {
      dismiss(bar, 'granted')
    }

    actions.appendChild(decline)
    actions.appendChild(accept)
    bar.appendChild(msg)
    bar.appendChild(actions)
    document.body.appendChild(bar)
  }

  var choice
  try {
    choice = localStorage.getItem(KEY)
  } catch {
    choice = null
  }

  if (choice === 'granted') {
    loadAds()
  } else if (choice !== 'denied') {
    if (document.body) showBanner()
    else document.addEventListener('DOMContentLoaded', showBanner)
  }
})()
