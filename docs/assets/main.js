/* ============================================
   GTDB-MCP — Minimal Interaction Script
   ============================================ */

(function () {
    'use strict';

    // Add shadow to nav on scroll
    var nav = document.getElementById('nav');
    var scrolledClass = 'scrolled';

    function handleScroll() {
        if (window.scrollY > 10) {
            nav.classList.add(scrolledClass);
        } else {
            nav.classList.remove(scrolledClass);
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Smooth scroll for anchor links (with nav offset)
    var navHeight = nav.offsetHeight;

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var href = link.getAttribute('href');
            if (href === '#' || href === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            var target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                var rect = target.getBoundingClientRect();
                var offsetTop = rect.top + window.scrollY - navHeight - 20;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
})();
