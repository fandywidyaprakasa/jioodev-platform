// JiooDev template runtime (minimal)
(function () {
  // Tahun berjalan
  var y = document.querySelector('[data-bind="year"]');
  if (y) y.textContent = String(new Date().getFullYear());

  // Opsional: hydrate dari data (JS Panel / API)
  var data = window.JiooDev_DATA || {};
  Object.keys(data).forEach(function (key) {
    document.querySelectorAll('[data-bind="' + key + '"]').forEach(function (el) {
      if (typeof data[key] === 'string') el.textContent = data[key];
    });
  });

  // Form placeholder (belum terhubung API)
  var form = document.querySelector('.offer-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-note');
      if (note) note.textContent = 'Terima kasih. Form akan aktif setelah terhubung API.';
    });
  }
})();
