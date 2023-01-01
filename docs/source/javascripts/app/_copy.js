function copyToClipboard(container) {
  const el = document.createElement('textarea');
  el.value = container.textContent.replace(/\n$/, '');
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function setupCodeCopy() {
  $('pre.highlight').prepend('<div class="copy-clipboard"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Copy to Clipboard</title><path d="M18 6v-6h-18v18h6v6h18v-18h-6zm-12 10h-4v-14h14v4h-10v10zm16 6h-14v-14h14v14z"></path></svg></div>');
  $('.copy-clipboard').on('click', function () {
    const copyDiv = this;
    //<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>
    copyToClipboard(this.parentNode.children[1]);
    $(copyDiv).html('<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 18 18" version="1.1" id="svg5"><g id="layer1"><path style="fill:#12ff35;fill-opacity:1;stroke:#12ff35;stroke-width: 1;stroke-dasharray:none;stroke-opacity:1" id="path11841" d="M 17.500458,9.4454275 A 8.5120964,8.5120564 0 0 1 8.6658434,17.505435 8.5120964,8.5120564 0 0 1 0.49084718,8.7771212 8.5120964,8.5120564 0 0 1 9.1114466,0.48861377 8.5120964,8.5120564 0 0 1 17.512123,8.9999409 Z"/><path style="fill:#12ff35;fill-opacity:1;stroke:#ffffff;stroke-width: 2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1" d="m 4,9 5,4 5,-7" id="path12111"/></g></svg>');
    setTimeout(function () {
      $(copyDiv).html('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Copy to Clipboard</title><path d="M18 6v-6h-18v18h6v6h18v-18h-6zm-12 10h-4v-14h14v4h-10v10zm16 6h-14v-14h14v14z"></path></svg>')
    }, 500);
  });
}
