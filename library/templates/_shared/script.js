(function () {
  var y = document.querySelector('[data-bind="year"]');
  if (y) y.textContent = String(new Date().getFullYear());

  var data = window.JiooDev_DATA || {};
  Object.keys(data).forEach(function (key) {
    document.querySelectorAll('[data-bind="' + key + '"]').forEach(function (el) {
      if (typeof data[key] === "string") el.textContent = data[key];
    });
  });

  document.querySelectorAll("form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (form.getAttribute("action") === "#") {
        e.preventDefault();
        var note = form.querySelector(".form-note");
        if (note) note.textContent = "Terima kasih. Form akan aktif setelah terhubung API.";
      }
    });
  });
})();
