/* ============================================================
   Góc Tâm Thư — Main JavaScript
   Complete animation system + application logic
   ============================================================ */

(function () {
  'use strict';

  // ── Feature Detection ──
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isAboutPage = document.body.classList.contains('about-page');
  const isAdminPage = document.body.classList.contains('admin-page');

  // ── Utility Functions ──
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const wordCount = (value) => (value.trim() ? value.trim().split(/\s+/).length : 0);

  // ── Cleanup Registry ──
  const cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }
  window.addEventListener('beforeunload', () => cleanups.forEach((fn) => fn()));

  /* ============================================================
     1. PRELOADER
     ============================================================ */
  function initPreloader() {
    const preloader = qs('#preloader');
    if (!preloader) return;

    const progress = qs('.preloader-progress', preloader);
    let width = 0;

    function animateProgress() {
      if (width < 90) {
        width += Math.random() * 15 + 5;
        width = Math.min(width, 90);
        if (progress) progress.style.width = width + '%';
        requestAnimationFrame(() => setTimeout(animateProgress, 100 + Math.random() * 200));
      }
    }
    animateProgress();

    function hidePreloader() {
      if (progress) progress.style.width = '100%';
      setTimeout(() => {
        document.body.classList.add('loaded');
        setTimeout(() => {
          preloader.style.display = 'none';
          initEntryAnimations();
        }, 800);
      }, 400);
    }

    if (document.readyState === 'complete') {
      hidePreloader();
    } else {
      window.addEventListener('load', hidePreloader, { once: true });
    }
    // Fallback
    setTimeout(hidePreloader, 5000);
  }

  /* ============================================================
     2. CUSTOM CURSOR
     ============================================================ */
  function initCursor() {
    if (isTouchDevice || prefersReducedMotion) return;

    const dot = qs('.cursor-dot');
    const ring = qs('.cursor-ring');
    if (!dot || !ring) return;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isHovering = false;
    let isClicking = false;
    let rafId;

    function updateCursor() {
      ringX = lerp(ringX, mouseX, 0.15);
      ringY = lerp(ringY, mouseY, 0.15);

      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) scale(${isClicking ? 0.5 : isHovering ? 1.5 : 1})`;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) scale(${isClicking ? 0.8 : isHovering ? 1.6 : 1})`;

      rafId = requestAnimationFrame(updateCursor);
    }

    function onMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }

    function onMouseDown() { isClicking = true; }
    function onMouseUp() { isClicking = false; }

    function onMouseEnterInteractive() { isHovering = true; ring.classList.add('hovering'); }
    function onMouseLeaveInteractive() { isHovering = false; ring.classList.remove('hovering'); }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });

    const interactiveSelector = 'a, button, input, select, textarea, .tilt-card, .magnetic-btn, .control-btn';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) onMouseEnterInteractive();
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveSelector)) onMouseLeaveInteractive();
    });

    rafId = requestAnimationFrame(updateCursor);
    onCleanup(() => cancelAnimationFrame(rafId));
  }

  /* ============================================================
     3. MAGNETIC BUTTONS
     ============================================================ */
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    qsa('.magnetic-btn').forEach((btn) => {
      function onMove(e) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        const inner = qs('span', btn);
        if (inner) inner.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
      }

      function onLeave() {
        btn.style.transform = '';
        const inner = qs('span', btn);
        if (inner) inner.style.transform = '';
      }

      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
    });
  }

  /* ============================================================
     4. 3D TILT CARDS
     ============================================================ */
  function initTiltCards() {
    if (isTouchDevice || prefersReducedMotion) return;

    qsa('.tilt-card').forEach((card) => {
      function onMove(e) {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(10px)`;

        const glow = qs('.card-glow', card);
        if (glow) {
          glow.style.opacity = '1';
          glow.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,79,129,0.15), transparent 60%)`;
        }
      }

      function onLeave() {
        card.style.transform = '';
        const glow = qs('.card-glow', card);
        if (glow) glow.style.opacity = '0';
      }

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  }

  /* ============================================================
     5. SCROLL REVEAL ANIMATIONS
     ============================================================ */
  function initScrollReveal() {
    const reveals = qsa('.reveal');
    if (!reveals.length) return;

    if (prefersReducedMotion) {
      reveals.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    reveals.forEach((el) => observer.observe(el));
    onCleanup(() => observer.disconnect());
  }

  /* ============================================================
     6. PARALLAX SCROLLING
     ============================================================ */
  function initParallax() {
    if (prefersReducedMotion) return;

    const orbs = qsa('.orb');
    if (!orbs.length) return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        orbs.forEach((orb, i) => {
          const speed = 0.15 + i * 0.1;
          orb.style.transform = `translateY(${scrollY * speed}px)`;
        });
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => window.removeEventListener('scroll', onScroll));
  }

  /* ============================================================
     7. TEXT REVEAL ANIMATION
     ============================================================ */
  function initTextReveal() {
    if (prefersReducedMotion) return;

    qsa('.text-reveal').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.display = 'inline-block';
      el.style.transition = `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.15}s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.15}s`;
    });
  }

  function triggerTextReveal() {
    qsa('.text-reveal').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  /* ============================================================
     8. COUNTER ANIMATION
     ============================================================ */
  function animateCounter(el, target) {
    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }

    const duration = 1500;
    const start = parseInt(el.textContent) || 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  /* ============================================================
     9. NAVIGATION
     ============================================================ */
  function initNavigation() {
    const topbar = qs('.topbar');
    if (!topbar) return;

    // Scroll-based nav styling
    let lastScroll = 0;
    function onScroll() {
      const scrollY = window.scrollY;
      if (scrollY > 50) {
        topbar.classList.add('scrolled');
      } else {
        topbar.classList.remove('scrolled');
      }
      lastScroll = scrollY;
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Active section tracking
    const navLinks = qsa('.nav-link');
    const indicator = qs('.nav-indicator');
    const sections = qsa('section[id], header[id]');

    function updateActiveLink() {
      const scrollY = window.scrollY + 200;
      let activeId = '';

      sections.forEach((section) => {
        if (section.offsetTop <= scrollY) {
          activeId = section.id;
        }
      });

      navLinks.forEach((link) => {
        const isActive = link.dataset.section === activeId;
        link.classList.toggle('active', isActive);

        if (isActive && indicator) {
          const rect = link.getBoundingClientRect();
          const navRect = link.parentElement.getBoundingClientRect();
          indicator.style.width = rect.width + 'px';
          indicator.style.left = rect.left - navRect.left + 'px';
        }
      });
    }

    if (!isAboutPage) {
      window.addEventListener('scroll', updateActiveLink, { passive: true });
      updateActiveLink();
    }

    // Hamburger menu
    const hamburger = qs('.hamburger');
    const mobileMenu = qs('.mobile-menu');

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('active');
        hamburger.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        mobileMenu.setAttribute('aria-hidden', String(!isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on mobile link click
      qsa('.mobile-link', mobileMenu).forEach((link) => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('active');
          hamburger.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          mobileMenu.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        });
      });
    }

    // Smooth scroll for nav links
    qsa('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = qs(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ============================================================
     10. FLOATING PARTICLES (Background FX)
     ============================================================ */
  function initFloatingParticles() {
    const fx = qs('#fx');
    if (!fx || prefersReducedMotion) return;

    const emojis = ['💌', '💗', '✨', '🌸', '💫', '🌟', '💖', '🦋'];
    const maxParticles = isTouchDevice ? 6 : 12;
    let activeParticles = 0;

    function createParticle() {
      if (activeParticles >= maxParticles) return;
      activeParticles++;

      const el = document.createElement('div');
      el.className = 'float';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.fontSize = (14 + Math.random() * 18) + 'px';
      el.style.animationDuration = (8 + Math.random() * 12) + 's';
      el.style.opacity = String(0.2 + Math.random() * 0.4);
      fx.appendChild(el);

      el.addEventListener('animationend', () => {
        el.remove();
        activeParticles--;
      }, { once: true });
    }

    const interval = setInterval(createParticle, 2500);
    // Create initial batch
    for (let i = 0; i < 4; i++) setTimeout(createParticle, i * 600);

    onCleanup(() => clearInterval(interval));
  }

  /* ============================================================
     11. GSAP ANIMATIONS (ScrollTrigger)
     ============================================================ */
  function initGSAPAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // Parallax orbs with GSAP
    qsa('.orb').forEach((orb, i) => {
      gsap.to(orb, {
        y: () => window.innerHeight * (0.3 + i * 0.15),
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5,
        },
      });
    });

    // Section divider animation
    qsa('.divider-line').forEach((line) => {
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: line,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    // Feature items stagger
    const featureItems = qsa('.feature-item');
    if (featureItems.length) {
      gsap.from(featureItems, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.info-features',
          start: 'top 80%',
        },
      });
    }

    // Footer reveal
    const footer = qs('footer');
    if (footer) {
      gsap.from(footer, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
        },
      });
    }
  }

  /* ============================================================
     12. ENTRY ANIMATIONS (After preloader)
     ============================================================ */
  function initEntryAnimations() {
    if (prefersReducedMotion) return;

    // Trigger hero text reveal
    setTimeout(triggerTextReveal, 200);

    // Trigger scroll reveal for above-fold elements
    setTimeout(() => {
      qsa('.hero .reveal').forEach((el) => el.classList.add('visible'));
    }, 600);
  }

  /* ============================================================
     13. FORM INTERACTIONS
     ============================================================ */
  function initFormEffects() {
    // Input focus glow effects
    qsa('.input-wrapper').forEach((wrapper) => {
      const input = qs('input, select, textarea', wrapper);
      const glow = qs('.input-glow', wrapper);
      if (!input || !glow) return;

      input.addEventListener('focus', () => glow.classList.add('active'));
      input.addEventListener('blur', () => glow.classList.remove('active'));
    });
  }

  /* ============================================================
     14. MUSIC VISUALIZER INDICATOR
     ============================================================ */
  function createMusicBars(button) {
    const existing = qs('.music-bars', button);
    if (existing) return existing;

    const container = document.createElement('div');
    container.className = 'music-bars';
    for (let i = 0; i < 4; i++) {
      const bar = document.createElement('span');
      bar.className = 'music-bar';
      bar.style.animationDelay = `${i * 0.15}s`;
      container.appendChild(bar);
    }
    button.appendChild(container);
    return container;
  }

  /* ============================================================
     APPLICATION LOGIC
     ============================================================ */

  // Skip app logic on admin/about pages without forms
  if (isAdminPage) {
    initPreloader();
    return;
  }

  // ── State ──
  let letters = [], index = 0, timer = null, loading = false, slideshowPaused = false;

  // ── DOM References ──
  const form = qs('#form');
  const nameEl = qs('#name');
  const typeEl = qs('#type');
  const msgEl = qs('#message');
  const screen = qs('#screen');
  const info = qs('#info');
  const currentType = qs('#currentType');
  const count = qs('#count');
  const fx = qs('#fx');
  const musicToggle = qs('#music-toggle');
  const backgroundMusic = qs('#background-music');
  const anonymousEl = qs('#anonymous');
  const submitButton = qs('#submit-button');
  const toast = qs('#toast');
  const letterCount = qs('#letter-count');

  // ── Toast Notification ──
  function notify(message, type = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ── Local Storage ──
  function localLetters() {
    try { return JSON.parse(localStorage.getItem('letters') || '[]'); }
    catch { return []; }
  }
  function saveLocal() { localStorage.setItem('letters', JSON.stringify(letters)); }

  // ── Render Letter ──
  function render() {
    if (!screen) return;

    if (!letters.length) {
      screen.innerHTML = `
        <div class="empty">
          <span class="empty-icon">💗</span>
          <strong>Đang chờ những lời nhắn...</strong>
          <small>Hãy gửi tâm thư đầu tiên.</small>
        </div>`;
      if (info) info.textContent = '0 / 0';
      if (currentType) currentType.textContent = '💌 Tâm thư';
      if (letterCount) animateCounter(letterCount, 0);
      return;
    }

    const item = letters[index];
    screen.dataset.type = item.type;
    screen.innerHTML = `
      <article class="letter">
        <span class="tag">${esc(item.type)}</span>
        <h2>${esc(item.name || 'Một người bạn')}</h2>
        <p>${esc(item.message)}</p>
        <small>Gửi lúc ${new Date(item.createdAt).toLocaleString('vi-VN')}</small>
        <button class="delete-letter" id="delete-letter" type="button">
          <span>🗑</span> Xóa tâm thư này
        </button>
      </article>`;

    if (info) info.textContent = `${index + 1} / ${letters.length}`;
    if (currentType) currentType.textContent = item.type;
    if (letterCount) animateCounter(letterCount, letters.length);

    const playStatus = qs('#play-status');
    if (playStatus) playStatus.textContent = letters.length > 1 && !slideshowPaused ? 'Đang phát' : 'Đã sẵn sàng';

    const deleteBtn = qs('#delete-letter');
    if (deleteBtn) deleteBtn.onclick = deleteCurrent;
  }

  // ── API ──
  async function load() {
    try {
      const response = await fetch(`/api/letters?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      letters = await response.json();
      saveLocal();
      document.body.dataset.connection = 'online';
    } catch {
      letters = localLetters();
      document.body.dataset.connection = 'offline';
    }
    if (index >= letters.length) index = Math.max(0, letters.length - 1);
    render();
    restart();
  }

  async function deleteCurrent() {
    const item = letters[index];
    if (!item || !confirm('Bạn có chắc muốn xóa tâm thư này không?')) return;
    const response = await fetch(`/api/letters/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (!response.ok) { notify('Không thể xóa: mã quản trị không đúng.', 'error'); return; }
    letters.splice(index, 1);
    index = Math.min(index, Math.max(0, letters.length - 1));
    saveLocal();
    render();
    restart();
    notify('Đã xóa tâm thư.');
  }

  function next() { if (!letters.length) return; index = (index + 1) % letters.length; render(); }
  function prev() { if (!letters.length) return; index = (index - 1 + letters.length) % letters.length; render(); }
  function restart() {
    clearInterval(timer); timer = null;
    if (letters.length > 1 && !slideshowPaused) timer = setInterval(next, 5000);
  }

  // ── Form Events ──
  if (msgEl && count) {
    msgEl.addEventListener('input', () => { count.textContent = wordCount(msgEl.value); });
  }

  const clearForm = qs('#clear-form');
  if (clearForm && form && msgEl && count) {
    clearForm.onclick = () => { form.reset(); count.textContent = '0'; msgEl.focus(); };
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!msgEl) return;
      const message = msgEl.value.trim();
      const words = wordCount(message);
      if (!message) { notify('Bạn hãy viết một lời nhắn trước nhé.', 'error'); msgEl.focus(); return; }
      if (words > 1000) { notify('Tâm thư chỉ được tối đa 1.000 từ.', 'error'); return; }
      if (loading) return;
      loading = true;
      if (submitButton) { submitButton.disabled = true; submitButton.querySelector('span').textContent = 'Đang gửi...'; }

      try {
        const response = await fetch('/api/letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: anonymousEl && anonymousEl.checked ? '' : (nameEl ? nameEl.value.trim() : ''),
            type: typeEl ? typeEl.value : '💌 Tâm thư',
            message,
          }),
        });
        if (!response.ok) throw new Error();
        letters.push(await response.json());
        index = letters.length - 1;
        form.reset();
        if (count) count.textContent = '0';
        render();
        restart();
        notify('Đã gửi tâm thư thành công.');
        // Create spark burst
        createSparkBurst();
      } catch {
        notify('Không thể kết nối máy chủ. Hãy thử lại sau.', 'error');
      }
      loading = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.querySelector('span').textContent = 'Gửi tâm thư 💖';
      }
    });
  }

  // ── Spark Burst Effect ──
  function createSparkBurst() {
    if (prefersReducedMotion || !fx) return;
    const emojis = ['💖', '✨', '💌', '🌸', '💫'];
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      spark.style.left = 40 + Math.random() * 20 + '%';
      spark.style.top = '50%';
      spark.style.setProperty('--angle', (Math.random() * 360) + 'deg');
      spark.style.setProperty('--distance', (60 + Math.random() * 80) + 'px');
      fx.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  }

  // ── Slideshow Controls ──
  const nextBtn = qs('#next');
  const prevBtn = qs('#prev');
  if (nextBtn) nextBtn.onclick = () => { next(); restart(); };
  if (prevBtn) {
    prevBtn.onclick = () => { prev(); restart(); };
    prevBtn.addEventListener('click', () => {
      const display = qs('#display');
      if (display) window.scrollTo({ top: display.offsetTop - 20, behavior: 'smooth' });
    });
  }

  const pauseBtn = qs('#pause-slideshow');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      slideshowPaused = !slideshowPaused;
      pauseBtn.setAttribute('aria-pressed', String(slideshowPaused));
      pauseBtn.textContent = slideshowPaused ? '▶ Phát tiếp' : '⏸ Tạm dừng';
      restart();
      render();
    };
  }

  // ── Presentation Mode ──
  const presentationBtn = qs('#presentation');
  if (presentationBtn) {
    presentationBtn.onclick = () => {
      document.documentElement.requestFullscreen?.();
      document.body.classList.add('presentation');
    };
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('presentation');
  });

  // ── Music Controls ──
  function setupMusicToggle(button, isMobile) {
    if (!button || !backgroundMusic) return;

    button.onclick = async () => {
      if (!backgroundMusic.paused) {
        backgroundMusic.pause();
        if (isMobile) {
          button.textContent = '🎵 Bật nhạc';
        } else {
          const label = qs('.music-label', button);
          if (label) label.textContent = 'Bật nhạc';
          button.classList.remove('playing');
        }
        if (musicToggle) musicToggle.setAttribute('aria-pressed', 'false');
        return;
      }
      try {
        await backgroundMusic.play();
        if (isMobile) {
          button.textContent = '⏸ Tắt nhạc';
        } else {
          const label = qs('.music-label', button);
          if (label) label.textContent = 'Tắt nhạc';
          button.classList.add('playing');
          createMusicBars(button);
        }
        if (musicToggle) musicToggle.setAttribute('aria-pressed', 'true');
      } catch {
        notify('Không thể phát file nhạc.', 'error');
      }
    };
  }

  setupMusicToggle(musicToggle, false);
  setupMusicToggle(qs('#mobile-music-toggle'), true);

  // ── Keyboard Navigation ──
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') next();
    if (event.key === 'ArrowLeft') prev();
    if (event.key === 'Escape') document.body.classList.remove('presentation');
  });

  // ── Online/Offline ──
  window.addEventListener('online', load);
  window.addEventListener('offline', () => {
    document.body.dataset.connection = 'offline';
    notify('Mất kết nối mạng.', 'error');
  });

  /* ============================================================
     INITIALIZATION
     ============================================================ */
  function init() {
    initPreloader();
    initCursor();
    initTextReveal();
    initScrollReveal();
    initMagneticButtons();
    initTiltCards();
    initNavigation();
    initParallax();
    initFloatingParticles();
    initFormEffects();

    // GSAP (after script loads)
    if (typeof gsap !== 'undefined') {
      initGSAPAnimations();
    } else {
      // Wait for GSAP to load (deferred)
      window.addEventListener('load', () => {
        setTimeout(initGSAPAnimations, 100);
      });
    }

    // Load letters (skip on about page)
    if (!isAboutPage) {
      load();
      const pollInterval = setInterval(load, 15000);
      onCleanup(() => clearInterval(pollInterval));
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
