(function () {
  var API_ORIGIN = 'https://reraos.onrender.com';

  fetch(API_ORIGIN + '/public/events/featured')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (event) {
      if (!event) return;

      var navLinks = document.querySelector('.nav-links');
      if (!navLinks) return;

      var link = document.createElement('a');
      link.href = '/events/' + event.slug;
      link.className = 'nav-event-link';
      link.title = event.title;
      link.innerHTML = '&#127881; Event';
      navLinks.appendChild(link);
    })
    .catch(function () {});
})();
