(function () {
  var COLORS = ['#ffe14a', '#e23d7a', '#5b4dff', '#1c7c4a', '#fff8ee'];

  function celebrate(anchor) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = document.createElement('div');
    layer.className = 'puzzle-celebrate';
    layer.setAttribute('aria-hidden', 'true');
    var rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    var originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    var originY = rect ? rect.top + rect.height * 0.42 : window.innerHeight * 0.35;
    var i;
    for (i = 0; i < 36; i += 1) {
      var bit = document.createElement('span');
      var angle = (Math.PI * 2 * i) / 36 + (Math.random() - 0.5) * 0.35;
      var distance = 80 + Math.random() * 170;
      bit.className = 'puzzle-bit';
      bit.style.setProperty('--origin-x', originX + 'px');
      bit.style.setProperty('--origin-y', originY + 'px');
      bit.style.setProperty('--x', (Math.cos(angle) * distance) + 'px');
      bit.style.setProperty('--y', (Math.sin(angle) * distance * 0.72 + 90) + 'px');
      bit.style.setProperty('--spin', ((Math.random() * 280) - 140) + 'deg');
      bit.style.setProperty('--size', (7 + Math.round(Math.random() * 8)) + 'px');
      bit.style.setProperty('--time', (1.15 + Math.random() * 0.45) + 's');
      bit.style.setProperty('--delay', (Math.random() * 0.06) + 's');
      bit.style.setProperty('--bit', COLORS[i % COLORS.length]);
      bit.style.setProperty('--round', Math.random() > 0.4 ? '999px' : '3px');
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    window.setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 1900);
  }

  window.puzzleCelebrate = celebrate;
})();
