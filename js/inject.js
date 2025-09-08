var s = document.createElement('script')
s.type = 'text/javascript'
s.src = chrome.runtime.getURL('js/spiderWei.js')
document.documentElement.appendChild(s)