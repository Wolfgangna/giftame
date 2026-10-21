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
  const isJoyPage = document.body.classList.contains('joy-page');
  const compactViewport = window.matchMedia('(max-width: 900px)');
  const desktopPointerMotion = !isTouchDevice && !compactViewport.matches;

  // ── Utility Functions ──
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const motionSeconds = (token) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const duration = Number.parseFloat(value);
    if (!Number.isFinite(duration)) throw new Error(`Missing motion token: ${token}`);
    return value.endsWith('ms') ? duration / 1000 : duration;
  };
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
    let hidden = false;
    let fallbackTimer;
    const pageInertStates = [...document.body.children]
      .filter((element) => element !== preloader)
      .map((element) => [element, element.inert]);
    pageInertStates.forEach(([element]) => { element.inert = true; });

    function hidePreloader(animate = true) {
      if (hidden) return;
      hidden = true;
      clearTimeout(fallbackTimer);
      if (progress) progress.style.width = '100%';
      preloader.setAttribute('aria-hidden', 'true');
      preloader.inert = true;
      const revealPage = () => {
        pageInertStates.forEach(([element, wasInert]) => { element.inert = wasInert; });
        document.body.classList.add('loaded');
        initEntryAnimations();
        if (animate) {
          setTimeout(() => {
            preloader.style.display = 'none';
          }, motionSeconds('--motion-complex') * 1000 + 40);
        } else {
          preloader.style.display = 'none';
        }
      };
      if (animate) {
        requestAnimationFrame(revealPage);
      } else {
        revealPage();
      }
    }

    if (document.documentElement.classList.contains('skip-preloader')) {
      hidePreloader(false);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => hidePreloader(), { once: true });
    } else {
      hidePreloader();
    }
    if (!hidden) fallbackTimer = setTimeout(() => hidePreloader(), 1800);
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
    let targetScale = 1;
    let currentScale = 1;
    let isClicking = false;
    let rafId;
    let cursorVisible = false;

    function updateCursor() {
      ringX = lerp(ringX, mouseX, 0.15);
      ringY = lerp(ringY, mouseY, 0.15);
      currentScale = lerp(currentScale, targetScale, 0.2);

      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(${isClicking ? 0.55 : currentScale})`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${isClicking ? 0.82 : currentScale})`;

      if (Math.abs(ringX - mouseX) > 0.1 || Math.abs(ringY - mouseY) > 0.1 || Math.abs(currentScale - targetScale) > 0.01) {
        rafId = requestAnimationFrame(updateCursor);
      } else {
        cursorVisible = false;
      }
    }

    function requestCursorUpdate() {
      if (cursorVisible) return;
      cursorVisible = true;
      rafId = requestAnimationFrame(updateCursor);
    }

    function onMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
      requestCursorUpdate();
    }

    function onMouseDown() { isClicking = true; requestCursorUpdate(); }
    function onMouseUp() { isClicking = false; requestCursorUpdate(); }
    function onPointerOver(event) {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest('a, button, input, select, textarea, [draggable="true"], [data-cursor]');
      if (!target) return;
      const state = target.dataset.cursor || (target.matches('[draggable="true"]') ? 'drag' : target.matches('a, button') ? 'interactive' : 'input');
      ring.dataset.state = state;
      targetScale = state === 'image' ? 2.1 : state === 'drag' ? 1.9 : 1.55;
      requestCursorUpdate();
    }
    function onPointerOut(event) {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest('a, button, input, select, textarea, [draggable="true"], [data-cursor]');
      if (!target || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
      targetScale = 1;
      delete ring.dataset.state;
      requestCursorUpdate();
    }
    function onDocumentLeave() {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      cancelAnimationFrame(rafId);
      cursorVisible = false;
    }
    function onDocumentEnter() { requestCursorUpdate(); }

    document.body.classList.add('cursor-enabled');
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    document.addEventListener('mouseleave', onDocumentLeave);
    document.addEventListener('mouseenter', onDocumentEnter);

    onCleanup(() => {
      cancelAnimationFrame(rafId);
      document.body.classList.remove('cursor-enabled');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('mouseleave', onDocumentLeave);
      document.removeEventListener('mouseenter', onDocumentEnter);
    });
  }

  /* ============================================================
     3. MAGNETIC BUTTONS
     ============================================================ */
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    qsa('.magnetic-btn').forEach((btn) => {
      let pointerX = 0, pointerY = 0, offsetX = 0, offsetY = 0;
      let active = false, frame = 0;
      const inner = qs(':scope > span', btn);

      function animate() {
        const rect = btn.getBoundingClientRect();
        const maxOffset = btn.classList.contains('control-btn') ? 4 : 7;
        const targetX = active ? clamp((pointerX - rect.left - rect.width / 2) * 0.16, -maxOffset, maxOffset) : 0;
        const targetY = active ? clamp((pointerY - rect.top - rect.height / 2) * 0.16, -maxOffset, maxOffset) : 0;
        offsetX = lerp(offsetX, targetX, 0.22);
        offsetY = lerp(offsetY, targetY, 0.22);
        btn.style.setProperty('--magnetic-x', `${offsetX.toFixed(2)}px`);
        btn.style.setProperty('--magnetic-y', `${offsetY.toFixed(2)}px`);
        if (inner) {
          inner.style.setProperty('--magnetic-inner-x', `${(offsetX * 0.2).toFixed(2)}px`);
          inner.style.setProperty('--magnetic-inner-y', `${(offsetY * 0.2).toFixed(2)}px`);
        }
        if (Math.abs(offsetX - targetX) > 0.08 || Math.abs(offsetY - targetY) > 0.08) {
          frame = requestAnimationFrame(animate);
        } else {
          frame = 0;
        }
      }

      function requestAnimation() {
        if (!frame) frame = requestAnimationFrame(animate);
      }
      function onMove(event) { pointerX = event.clientX; pointerY = event.clientY; requestAnimation(); }
      function onEnter(event) { active = true; pointerX = event.clientX; pointerY = event.clientY; requestAnimation(); }
      function onLeave() { active = false; requestAnimation(); }

      btn.addEventListener('pointermove', onMove, { passive: true });
      btn.addEventListener('pointerenter', onEnter, { passive: true });
      btn.addEventListener('pointerleave', onLeave);
      onCleanup(() => {
        if (frame) cancelAnimationFrame(frame);
        btn.style.removeProperty('--magnetic-x');
        btn.style.removeProperty('--magnetic-y');
        if (inner) {
          inner.style.removeProperty('--magnetic-inner-x');
          inner.style.removeProperty('--magnetic-inner-y');
        }
        btn.removeEventListener('pointermove', onMove);
        btn.removeEventListener('pointerenter', onEnter);
        btn.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  /* ============================================================
     4. 3D TILT CARDS
     ============================================================ */
  function initTiltCards() {
    if (!desktopPointerMotion || prefersReducedMotion) return;

    qsa('.tilt-card').forEach((card) => {
      let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
      let lightX = 50, lightY = 50, active = false, frame = 0;
      const glow = qs('.card-glow', card);

      function animate() {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          frame = 0;
          return;
        }
        const x = active ? clamp((pointerX - rect.left) / rect.width, 0, 1) : 0.5;
        const y = active ? clamp((pointerY - rect.top) / rect.height, 0, 1) : 0.5;
        const targetX = active ? (0.5 - y) * 5 : 0;
        const targetY = active ? (x - 0.5) * 5 : 0;
        tiltX = lerp(tiltX, targetX, 0.16);
        tiltY = lerp(tiltY, targetY, 0.16);
        lightX = lerp(lightX, x * 100, 0.2);
        lightY = lerp(lightY, y * 100, 0.2);
        card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        card.style.setProperty('--pointer-x', `${lightX.toFixed(1)}%`);
        card.style.setProperty('--pointer-y', `${lightY.toFixed(1)}%`);
        if (glow) {
          glow.style.opacity = active ? '1' : '0';
        }
        if (Math.abs(tiltX - targetX) > 0.03 || Math.abs(tiltY - targetY) > 0.03
          || Math.abs(lightX - x * 100) > 0.2 || Math.abs(lightY - y * 100) > 0.2) {
          frame = requestAnimationFrame(animate);
        } else {
          frame = 0;
        }
      }

      function requestAnimation() {
        if (!frame) frame = requestAnimationFrame(animate);
      }
      function onMove(event) { pointerX = event.clientX; pointerY = event.clientY; requestAnimation(); }
      function onEnter(event) { active = true; pointerX = event.clientX; pointerY = event.clientY; requestAnimation(); }
      function onLeave() { active = false; requestAnimation(); }

      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerenter', onEnter, { passive: true });
      card.addEventListener('pointerleave', onLeave);
      onCleanup(() => {
        if (frame) cancelAnimationFrame(frame);
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
        card.style.removeProperty('--pointer-x');
        card.style.removeProperty('--pointer-y');
        if (glow) glow.style.opacity = '';
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerenter', onEnter);
        card.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  function initPointerLighting() {
    if (!desktopPointerMotion || prefersReducedMotion) return;
    const root = document.documentElement;
    let pointerX = window.innerWidth * 0.5, pointerY = window.innerHeight * 0.35;
    let lightX = pointerX, lightY = pointerY, target = null, frame = 0;

    function updatePointerEffects() {
      lightX = lerp(lightX, pointerX, 0.18);
      lightY = lerp(lightY, pointerY, 0.18);
      root.style.setProperty('--pointer-light-x', `${lightX.toFixed(1)}px`);
      root.style.setProperty('--pointer-light-y', `${lightY.toFixed(1)}px`);

      if (target?.isConnected) {
        const bounds = target.getBoundingClientRect();
        const localX = clamp((pointerX - bounds.left) / bounds.width, 0, 1);
        const localY = clamp((pointerY - bounds.top) / bounds.height, 0, 1);
        target.style.setProperty('--pointer-x', `${(localX * 100).toFixed(1)}%`);
        target.style.setProperty('--pointer-y', `${(localY * 100).toFixed(1)}%`);
        if (target.matches('.hero-title')) {
          target.style.setProperty('--text-tilt-x', `${((0.5 - localY) * 2.2).toFixed(2)}deg`);
          target.style.setProperty('--text-tilt-y', `${((localX - 0.5) * 2.8).toFixed(2)}deg`);
        }
      }

      if (Math.abs(lightX - pointerX) > 0.35 || Math.abs(lightY - pointerY) > 0.35) {
        frame = requestAnimationFrame(updatePointerEffects);
      } else {
        frame = 0;
      }
    }
    function onPointerMove(event) {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      const element = event.target instanceof Element ? event.target.closest('.tilt-card, .joy-hero-art, .joy-cinematic-stage, .meaning-letter-art, .hero-title') : null;
      if (element !== target) {
        if (target) {
          target.classList.remove('pointer-lit');
          target.style.removeProperty('--pointer-x');
          target.style.removeProperty('--pointer-y');
          target.style.removeProperty('--text-tilt-x');
          target.style.removeProperty('--text-tilt-y');
        }
        target = element;
        if (target) target.classList.add('pointer-lit');
      }
      if (!frame) frame = requestAnimationFrame(updatePointerEffects);
    }
    function onPointerOut(event) {
      if (event.relatedTarget) return;
      if (target) {
        target.classList.remove('pointer-lit');
        target.style.removeProperty('--pointer-x');
        target.style.removeProperty('--pointer-y');
        target.style.removeProperty('--text-tilt-x');
        target.style.removeProperty('--text-tilt-y');
      }
      target = null;
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    onCleanup(() => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerout', onPointerOut);
      root.style.removeProperty('--pointer-light-x');
      root.style.removeProperty('--pointer-light-y');
      if (target) {
        target.classList.remove('pointer-lit');
        target.style.removeProperty('--pointer-x');
        target.style.removeProperty('--pointer-y');
        target.style.removeProperty('--text-tilt-x');
        target.style.removeProperty('--text-tilt-y');
      }
    });
  }

  function initClickFeedback() {
    if (prefersReducedMotion) return;
    const pending = new Set();
    const originalPositions = new WeakMap();

    function removeRipple(ripple) {
      const target = ripple.parentElement;
      clearTimeout(Number(ripple.dataset.cleanupTimer));
      ripple.remove();
      pending.delete(ripple);
      if (target && !target.querySelector('.interaction-ripple') && originalPositions.has(target)) {
        target.style.position = originalPositions.get(target);
        originalPositions.delete(target);
        target.classList.remove('ripple-host');
      }
    }

    function onPointerDown(event) {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const target = event.target.closest('button, .btn-primary, .btn-secondary, .btn-ghost, .control-btn');
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
      if (!originalPositions.has(target)) originalPositions.set(target, target.style.position);
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.classList.add('ripple-host');
      const bounds = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'interaction-ripple';
      ripple.style.left = `${event.clientX - bounds.left}px`;
      ripple.style.top = `${event.clientY - bounds.top}px`;
      ripple.style.setProperty('--ripple-scale', String(Math.max(bounds.width, bounds.height) * 2.4 / 12));
      target.appendChild(ripple);
      pending.add(ripple);
      const timer = setTimeout(() => removeRipple(ripple), 650);
      ripple.dataset.cleanupTimer = String(timer);
    }

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown);
      [...pending].forEach(removeRipple);
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
    if (!desktopPointerMotion || prefersReducedMotion) return;

    const orbs = qsa('.hero-bg .orb');
    if (!orbs.length) return;

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const scrollY = window.scrollY;
        orbs.forEach((orb, i) => {
          const speed = 0.15 + i * 0.1;
          orb.style.translate = `0 ${scrollY * speed}px`;
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    });
  }

  /* ============================================================
     7. TEXT REVEAL ANIMATION
     ============================================================ */
  function initTextReveal() {
    if (prefersReducedMotion) return;

    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-enter').trim();
    const duration = motionSeconds('--motion-enter');
    const stagger = motionSeconds('--motion-stagger');
    qsa('.text-reveal').forEach((el, i) => {
      const delay = stagger * i;
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.display = 'inline-block';
      el.style.transition = `opacity ${duration}s ${easing} ${delay}s, transform ${duration}s ${easing} ${delay}s`;
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

    const start = parseInt(el.textContent) || 0;
    if (start === target) return;
    const previousFrame = animateCounter.frames.get(el);
    if (previousFrame) cancelAnimationFrame(previousFrame);
    const duration = motionSeconds('--motion-complex') * 1000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) {
        animateCounter.frames.set(el, requestAnimationFrame(update));
      } else {
        animateCounter.frames.delete(el);
      }
    }

    animateCounter.frames.set(el, requestAnimationFrame(update));
  }
  animateCounter.frames = new WeakMap();

  function initVectorMotion() {
    if (prefersReducedMotion) return;
    const vectors = qsa('.vector-draw');
    if (!vectors.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

    vectors.forEach((vector) => {
      vector.classList.add('vector-draw-ready');
      observer.observe(vector);
    });
    onCleanup(() => {
      observer.disconnect();
      vectors.forEach((vector) => vector.classList.remove('vector-draw-ready', 'is-drawn'));
    });
  }

  /* ============================================================
     9. NAVIGATION
     ============================================================ */
  function initNavigation() {
    const topbar = qs('.topbar');
    if (!topbar) return;

    const navLinks = qsa('.nav-link');
    const indicator = qs('.nav-indicator');
    const sections = qsa('section[id], header[id]');
    let navFrame = 0;
    let sectionPositions = [];

    function measureSections() {
      sectionPositions = sections.map((section) => ({
        id: section.id,
        top: section.getBoundingClientRect().top + window.scrollY,
      }));
    }

    function updateNavigation() {
      navFrame = 0;
      const scrollY = window.scrollY;
      topbar.classList.toggle('scrolled', scrollY > 50);
      const activeThreshold = scrollY + 200;
      let activeId = '';

      sectionPositions.forEach((section) => {
        if (section.top <= activeThreshold) activeId = section.id;
      });
      const activeLink = navLinks.find((link) => link.dataset.section === activeId);
      let indicatorPosition;
      if (activeLink && indicator) {
        const rect = activeLink.getBoundingClientRect();
        const navRect = activeLink.parentElement.getBoundingClientRect();
        indicatorPosition = { width: rect.width, left: rect.left - navRect.left };
      }

      navLinks.forEach((link) => {
        link.classList.toggle('active', link === activeLink);
      });
      if (indicatorPosition) {
        indicator.style.width = `${indicatorPosition.width}px`;
        indicator.style.left = `${indicatorPosition.left}px`;
      }
    }
    function requestNavigationUpdate() {
      if (!navFrame) navFrame = requestAnimationFrame(updateNavigation);
    }
    function onNavigationResize() {
      measureSections();
      requestNavigationUpdate();
    }

    if (!isAboutPage) {
      measureSections();
      window.addEventListener('scroll', requestNavigationUpdate, { passive: true });
      window.addEventListener('resize', onNavigationResize, { passive: true });
      updateNavigation();
    }

    const hamburger = qs('.hamburger');
    const mobileMenu = qs('.mobile-menu');
    const menuLinks = mobileMenu ? qsa('.mobile-link', mobileMenu) : [];

    if (hamburger && mobileMenu) {
      let previousBodyOverflow = null;
      function toggleMobileMenu() {
        if (mobileMenu.classList.contains('active')) {
          closeMobileMenu();
          return;
        }
        previousBodyOverflow = document.body.style.overflow;
        mobileMenu.classList.add('active');
        hamburger.classList.add('active');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Đóng menu');
        mobileMenu.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const firstLink = mobileMenu.querySelector('.mobile-link');
        if (firstLink) setTimeout(() => firstLink.focus(), 0);
      }
      function closeMobileMenu() {
        mobileMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Mở menu');
        mobileMenu.setAttribute('aria-hidden', 'true');
        if (previousBodyOverflow !== null) {
          document.body.style.overflow = previousBodyOverflow;
          previousBodyOverflow = null;
        }
      }
      function onMenuKeyDown(event) {
        if (!mobileMenu.classList.contains('active')) return;
        if (event.key === 'Escape') {
          closeMobileMenu();
          hamburger.focus();
          return;
        }
        if (event.key !== 'Tab') return;
        const firstLink = menuLinks[0];
        const lastLink = menuLinks[menuLinks.length - 1];
        if (!firstLink || !lastLink) return;
        if (event.shiftKey && document.activeElement === firstLink) {
          event.preventDefault();
          lastLink.focus();
        } else if (!event.shiftKey && document.activeElement === lastLink) {
          event.preventDefault();
          firstLink.focus();
        }
      }
      function onMenuResize() {
        if (window.innerWidth > 768 && mobileMenu.classList.contains('active')) closeMobileMenu();
      }
      hamburger.addEventListener('click', toggleMobileMenu);
      menuLinks.forEach((link) => link.addEventListener('click', closeMobileMenu));
      document.addEventListener('keydown', onMenuKeyDown);
      window.addEventListener('resize', onMenuResize, { passive: true });
      onCleanup(() => {
        hamburger.removeEventListener('click', toggleMobileMenu);
        menuLinks.forEach((link) => link.removeEventListener('click', closeMobileMenu));
        document.removeEventListener('keydown', onMenuKeyDown);
        window.removeEventListener('resize', onMenuResize);
        if (mobileMenu.classList.contains('active')) closeMobileMenu();
      });
    }

    const anchorLinks = qsa('a[href^="#"]');
    const anchorHandlers = anchorLinks.map((link) => {
      const handler = (e) => {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return;
        const target = document.getElementById(hash.slice(1));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
      };
      link.addEventListener('click', handler);
      return { link, handler };
    });
    onCleanup(() => {
      if (navFrame) cancelAnimationFrame(navFrame);
      window.removeEventListener('scroll', requestNavigationUpdate);
      window.removeEventListener('resize', onNavigationResize);
      anchorHandlers.forEach(({ link, handler }) => link.removeEventListener('click', handler));
    });
  }

  /* ============================================================
     10. FLOATING PARTICLES (Background FX)
     ============================================================ */
  function initFloatingParticles() {
    const fx = qs('#fx');
    if (!fx || prefersReducedMotion || compactViewport.matches) return;

    const maxParticles = isTouchDevice ? 3 : 6;
    const particles = new Set();
    const startupTimers = [];
    let interval = 0;

    function createParticle() {
      if (document.hidden || particles.size >= maxParticles) return;

      const el = document.createElement('div');
      el.className = 'float float--particle';
      el.style.left = Math.random() * 100 + '%';
      el.style.setProperty('--particle-size', `${3 + Math.random() * 5}px`);
      el.style.animationDuration = (8 + Math.random() * 12) + 's';
      fx.appendChild(el);
      particles.add(el);

      el.addEventListener('animationend', () => {
        el.remove();
        particles.delete(el);
      }, { once: true });
    }

    function startParticleInterval() {
      if (!interval && !document.hidden) interval = setInterval(createParticle, 2500);
    }
    function onVisibilityChange() {
      if (document.hidden) {
        clearInterval(interval);
        interval = 0;
      } else {
        startParticleInterval();
      }
    }

    startParticleInterval();
    for (let i = 0; i < 3; i++) startupTimers.push(setTimeout(createParticle, i * 700));
    document.addEventListener('visibilitychange', onVisibilityChange);

    onCleanup(() => {
      clearInterval(interval);
      startupTimers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      particles.forEach((particle) => particle.remove());
      particles.clear();
    });
  }

  function initScrollProgress() {
    const root = document.documentElement;
    let frame = 0;

    function updateProgress() {
      const scrollableHeight = root.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      root.style.setProperty('--scroll-progress', String(clamp(progress, 0, 1)));
      if (!prefersReducedMotion) {
        root.style.setProperty('--ambient-scroll-offset', `${(window.scrollY * -0.018).toFixed(1)}px`);
      }
      frame = 0;
    }

    function requestProgressUpdate() {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    }

    window.addEventListener('scroll', requestProgressUpdate, { passive: true });
    window.addEventListener('resize', requestProgressUpdate, { passive: true });
    updateProgress();
    onCleanup(() => {
      window.removeEventListener('scroll', requestProgressUpdate);
      window.removeEventListener('resize', requestProgressUpdate);
      root.style.removeProperty('--ambient-scroll-offset');
      if (frame) cancelAnimationFrame(frame);
    });
  }

  function initMotionFallback() {
    if (prefersReducedMotion) return;

    const motionTargets = qsa('.joy-story-card, .joy-ripple-step, .joy-message-card, .joy-day-moment, .meaning-essay-section');
    if (motionTargets.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('motion-entered');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });

      motionTargets.forEach((target) => observer.observe(target));
      onCleanup(() => observer.disconnect());
    }

    const parallaxTargets = desktopPointerMotion
      ? qsa('.joy-hero-art, .joy-garden-sky')
      : [];
    if (!parallaxTargets.length) return;

    let frame = 0;
    function updateParallax() {
      const viewportHeight = window.innerHeight;
      parallaxTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) return;
        const centerOffset = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        target.style.translate = `0 ${clamp(centerOffset * -16, -14, 14)}px`;
      });
      frame = 0;
    }

    function requestParallaxUpdate() {
      if (!frame) frame = requestAnimationFrame(updateParallax);
    }

    window.addEventListener('scroll', requestParallaxUpdate, { passive: true });
    window.addEventListener('resize', requestParallaxUpdate, { passive: true });
    updateParallax();
    onCleanup(() => {
      window.removeEventListener('scroll', requestParallaxUpdate);
      window.removeEventListener('resize', requestParallaxUpdate);
      if (frame) cancelAnimationFrame(frame);
    });
  }

  /* ============================================================
     11. GSAP ANIMATIONS (ScrollTrigger)
     ============================================================ */
  function initGSAPAnimations() {
    if (prefersReducedMotion) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      initMotionFallback();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });
    const motion = {
      complex: motionSeconds('--motion-complex'),
      stagger: motionSeconds('--motion-stagger'),
    };
    ScrollTrigger.config({ ignoreMobileResize: true });

    const motionContext = gsap.context(() => {
      const scrollStoryMotion = gsap.matchMedia();
      scrollStoryMotion.add('(min-width: 901px)', () => {
        const root = document.documentElement;
        const originalStoryTone = root.style.getPropertyValue('--story-tone');
        const storyTones = isJoyPage
          ? ['rgba(73,109,89,0.055)', 'rgba(177,77,60,0.075)', 'rgba(168,121,62,0.065)', 'rgba(73,109,89,0.055)']
          : isAboutPage
            ? ['rgba(73,109,89,0.055)', 'rgba(177,77,60,0.075)', 'rgba(73,109,89,0.065)']
            : document.body.classList.contains('meaning-page')
              ? ['rgba(73,109,89,0.055)', 'rgba(177,77,60,0.07)', 'rgba(168,121,62,0.06)', 'rgba(73,109,89,0.055)']
              : ['rgba(73,109,89,0.055)', 'rgba(177,77,60,0.07)', 'rgba(168,121,62,0.06)', 'rgba(73,109,89,0.055)'];
        const interpolateStoryTone = gsap.utils.interpolate(storyTones);

        ScrollTrigger.create({
          trigger: document.body,
          start: 'top top',
          end: () => Math.max(ScrollTrigger.maxScroll(window), 1),
          onUpdate: (self) => root.style.setProperty('--story-tone', interpolateStoryTone(self.progress)),
        });

        const splitStoryWords = (element) => {
          const originalNodes = [...element.childNodes].map((node) => node.cloneNode(true));
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          let currentNode;
          while ((currentNode = walker.nextNode())) {
            if (currentNode.nodeValue.trim()) textNodes.push(currentNode);
          }
          const words = [];
          textNodes.forEach((textNode) => {
            const fragment = document.createDocumentFragment();
            (textNode.nodeValue.match(/\s+|[^\s]+/g) || []).forEach((token) => {
              if (/^\s+$/.test(token)) {
                fragment.append(document.createTextNode(token));
              } else {
                const word = document.createElement('span');
                word.className = 'scroll-story-word';
                word.textContent = token;
                words.push(word);
                fragment.append(word);
              }
            });
            textNode.replaceWith(fragment);
          });
          return { words, restore: () => element.replaceChildren(...originalNodes) };
        };

        const storyHeadings = qsa('main h2, main h3, main blockquote')
          .filter((heading) => !heading.closest('.joy-cinematic'));
        const restoreStoryHeadings = [];
        storyHeadings.forEach((heading) => {
          const { words, restore } = splitStoryWords(heading);
          if (words.length < 2) {
            restore();
            return;
          }
          restoreStoryHeadings.push(restore);
          gsap.fromTo(words, { autoAlpha: 0.35, yPercent: 28 }, {
            autoAlpha: 1,
            yPercent: 0,
            stagger: 0.045,
            ease: 'none',
            scrollTrigger: {
              trigger: heading,
              start: 'top 84%',
              end: 'bottom 42%',
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          });
        });

        qsa('.meaning-essay-section').forEach((section) => {
          const eyebrow = qs('.eyebrow', section);
          const paragraphs = qsa(':scope > p', section);
          const sideNote = qs('.meaning-side-note', section);
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 82%',
              end: 'bottom 34%',
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });
          if (eyebrow) timeline.fromTo(eyebrow, { y: 14, autoAlpha: 0.35 }, { y: 0, autoAlpha: 1, duration: 0.24 }, 0);
          if (paragraphs.length) {
            timeline.fromTo(paragraphs, { y: 18, autoAlpha: 0.4 }, {
              y: 0,
              autoAlpha: 1,
              duration: 0.54,
              stagger: 0.2,
            }, 0.08);
          }
          if (sideNote) {
            timeline.fromTo(sideNote, { x: section.classList.contains('meaning-essay-section--reverse') ? -16 : 16, autoAlpha: 0.35 }, {
              x: 0,
              autoAlpha: 1,
              duration: 0.42,
            }, 0.22);
          }
        });

        qsa('.meaning-letter-art, .joy-hero-art').forEach((art) => {
          gsap.fromTo(art, { clipPath: 'inset(12% 12% 12% 12% round 48%)' }, {
            clipPath: 'inset(0% 0% 0% 0% round 24px)',
            ease: 'none',
            scrollTrigger: {
              trigger: art,
              start: 'top 90%',
              end: 'top 38%',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
        });

        return () => {
          restoreStoryHeadings.forEach((restore) => restore());
          if (originalStoryTone) root.style.setProperty('--story-tone', originalStoryTone);
          else root.style.removeProperty('--story-tone');
        };
      });
      onCleanup(() => scrollStoryMotion.revert());

      qsa('.divider-line').forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: motion.complex,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: line,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      if (!isAboutPage && !isAdminPage) {
        const formFields = qsa('#send .input-wrapper');
        if (formFields.length) {
          gsap.fromTo(
            formFields,
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: motion.complex,
              stagger: motion.stagger,
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger: '#send', start: 'top 72%', once: true },
            }
          );
        }

        const display = qs('#display .screen');
        if (display) {
          gsap.fromTo(
            display,
            { y: 24, scale: 0.985, autoAlpha: 0 },
            {
              y: 0,
              scale: 1,
              autoAlpha: 1,
              duration: motion.complex,
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger: '#display', start: 'top 72%', once: true },
            }
          );
        }

        const featureIcons = qsa('#how-it-works .feature-icon');
        if (featureIcons.length) {
          gsap.fromTo(
            featureIcons,
            { scale: 0.72, rotate: -8, autoAlpha: 0 },
            {
              scale: 1,
              rotate: 0,
              autoAlpha: 1,
              duration: motion.complex,
              stagger: motion.stagger * 1.5,
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger: '#how-it-works', start: 'top 74%', once: true },
            }
          );
        }
      }

      if (isJoyPage) {
        const desktopJoyMotion = gsap.matchMedia();
        desktopJoyMotion.add('(min-width: 901px) and (min-height: 701px) and (hover: hover) and (pointer: fine)', () => {
          const cinematicSection = qs('.joy-cinematic');
          const cinematicStage = qs('.joy-cinematic-stage');
          const cinematicLines = cinematicStage ? qsa('.joy-cinematic-line', cinematicStage) : [];
          const originalLineText = cinematicLines.map((line) => line.textContent);
          if (cinematicSection && cinematicStage) {
          const cinematicProgress = qsa('.joy-cinematic-progress span', cinematicStage);
          if (cinematicProgress[0]) cinematicProgress[0].classList.add('is-active');
          const cinematicChars = cinematicLines.map((line) => {
            line.setAttribute('aria-hidden', 'true');
            const characters = [...line.textContent].map((character) => {
              const span = document.createElement('span');
              span.className = 'joy-cinematic-char';
              span.setAttribute('aria-hidden', 'true');
              span.textContent = character === ' ' ? '\u00a0' : character;
              return span;
            });
            line.replaceChildren(...characters);
            return characters;
          });

          document.body.classList.add('joy-cinematic-enabled');
          const cinematicTimeline = gsap.timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: {
              trigger: cinematicSection,
              start: 'top top+=64',
              end: 'bottom bottom',
              scrub: 0.65,
              pin: cinematicStage,
              pinSpacing: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                cinematicStage.style.setProperty('--scene-progress', String(self.progress));
                const activeChapter = Math.min(cinematicProgress.length - 1, Math.floor(self.progress * cinematicProgress.length));
                cinematicProgress.forEach((marker, index) => marker.classList.toggle('is-active', index === activeChapter));
              },
            },
          });

          cinematicLines.forEach((line, index) => {
            const start = index * 1.04;
            cinematicTimeline.fromTo(line, { autoAlpha: 0, filter: 'blur(8px)' }, {
              autoAlpha: 1,
              filter: 'blur(0px)',
              duration: 0.18,
            }, start);
            cinematicTimeline.fromTo(cinematicChars[index], {
              yPercent: 112,
              autoAlpha: 0,
            }, {
              yPercent: 0,
              autoAlpha: 1,
              duration: 0.34,
              stagger: 0.012,
              clearProps: 'transform,opacity,visibility',
            }, start + 0.05);
            cinematicTimeline.to(line, {
              autoAlpha: 0,
              filter: 'blur(7px)',
              duration: 0.16,
              ease: 'power2.in',
            }, start + 0.92);
          });

          cinematicTimeline
            .fromTo('.joy-cinematic-halo', { scale: 0.72, autoAlpha: 0.55 }, {
              scale: 1.16,
              autoAlpha: 1,
              duration: 3,
              ease: 'none',
            }, 0)
            .fromTo('.joy-cinematic-core', { scale: 0.7, autoAlpha: 0.5 }, {
              scale: 1.15,
              autoAlpha: 1,
              duration: 2.8,
              ease: 'none',
            }, 0.1)
            .fromTo('.joy-cinematic-petal--one', { x: -24, y: 16, rotate: -12 }, {
              x: 10,
              y: -18,
              rotate: 8,
              duration: 2.8,
              ease: 'none',
            }, 0)
            .fromTo('.joy-cinematic-petal--two', { x: 22, y: -12, rotate: 12 }, {
              x: -12,
              y: 18,
              rotate: -8,
              duration: 2.8,
              ease: 'none',
            }, 0)
            .fromTo(cinematicProgress, { scaleX: 0.5, autoAlpha: 0.45 }, {
              scaleX: 1,
              autoAlpha: 1,
              duration: 0.16,
              stagger: 0.94,
              ease: 'none',
            }, 0)
            .fromTo(cinematicStage, { '--scene-warmth': 0.08 }, {
              '--scene-warmth': 0.19,
              duration: 2.8,
              ease: 'none',
            }, 0);
          }

          const heroArt = qs('.joy-hero-art');
          if (heroArt) {
            gsap.to(heroArt, {
              yPercent: 13,
              rotate: 2,
              ease: 'none',
              scrollTrigger: { trigger: '.joy-hero', start: 'top top', end: 'bottom top', scrub: 1.2 },
            });
          }

          const garden = qs('.joy-garden');
          if (garden) {
            gsap.to('.joy-garden-sky', {
              yPercent: 12,
              ease: 'none',
              scrollTrigger: { trigger: garden, start: 'top bottom', end: 'bottom top', scrub: 1.4 },
            });
          }
          const gallery = qs('.joy-message-gallery');
          const galleryTrack = gallery ? qs('.joy-message-cards', gallery) : null;
          const galleryCards = galleryTrack ? qsa('.joy-message-card', galleryTrack) : [];
          if (gallery && galleryTrack && galleryCards.length > 1) {
            gallery.classList.add('joy-message-gallery--horizontal');
            const galleryViewportWidth = () => {
              const styles = getComputedStyle(gallery);
              return gallery.clientWidth - Number.parseFloat(styles.paddingLeft) - Number.parseFloat(styles.paddingRight);
            };
            const galleryTravelDistance = () => Math.max(0, galleryTrack.scrollWidth - galleryViewportWidth());
            gsap.to(galleryTrack, {
              x: () => -galleryTravelDistance(),
              ease: 'none',
              scrollTrigger: {
                trigger: gallery,
                start: 'top top+=96',
                end: () => `+=${Math.max(window.innerHeight * 0.9, galleryTravelDistance())}`,
                scrub: 0.65,
                pin: gallery,
                pinSpacing: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => gallery.style.setProperty('--gallery-progress', String(self.progress)),
              },
            });
          }
          return () => {
            document.body.classList.remove('joy-cinematic-enabled');
            if (gallery) {
              gallery.classList.remove('joy-message-gallery--horizontal');
              gallery.style.removeProperty('--gallery-progress');
            }
            cinematicLines.forEach((line, index) => {
              line.replaceChildren(document.createTextNode(originalLineText[index] || ''));
              line.removeAttribute('aria-hidden');
            });
            qsa('.joy-cinematic-progress .is-active').forEach((marker) => marker.classList.remove('is-active'));
          };
        });
        onCleanup(() => desktopJoyMotion.revert());

        qsa('.joy-story-card').forEach((card, index) => {
          const content = qs(':scope > div', card);
          const icon = qs('.joy-story-icon', card);
          const targets = [icon, content].filter(Boolean);
          gsap.fromTo(
            targets,
            { y: 28, x: index % 2 ? 14 : 0, autoAlpha: 0 },
            {
              y: 0,
              x: 0,
              autoAlpha: 1,
              duration: motion.complex,
              stagger: motion.stagger * 1.5,
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger: card, start: 'top 78%', once: true },
            }
          );
        });

        qsa('.joy-ripple-step, .joy-message-card, .joy-day-moment').forEach((card, index) => {
          const icon = qs('.joy-ripple-step-icon, .joy-message-card-mark, .joy-day-marker', card);
          const heading = qs('h3, blockquote', card);
          const targets = [icon, heading].filter(Boolean);
          if (!targets.length) return;
          gsap.fromTo(
            targets,
            { y: 18, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: motion.complex,
              stagger: motion.stagger,
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger: card, start: 'top 82%', once: true },
              delay: (index % 3) * motion.stagger * 0.45,
            }
          );
        });
      }

      if (document.body.classList.contains('meaning-page')) {
        qsa('.meaning-examples').forEach((examples) => {
          const cards = qsa('.meaning-example-card', examples);
          if (!cards.length) return;
          gsap.fromTo(cards, { y: 24, autoAlpha: 0 }, {
            y: 0,
            autoAlpha: 1,
            duration: motion.complex,
            stagger: motion.stagger * 1.5,
            clearProps: 'transform,opacity,visibility',
            scrollTrigger: { trigger: examples, start: 'top 78%', once: true },
          });
        });
      }
    });

    onCleanup(() => motionContext.revert());
  }

  /* ============================================================
     12. ENTRY ANIMATIONS (After preloader)
     ============================================================ */
  function initEntryAnimations() {
    if (prefersReducedMotion) return;

    requestAnimationFrame(() => {
      triggerTextReveal();
      qsa('.hero .reveal, .about-content > .reveal, .meaning-hero .reveal, .joy-hero .reveal')
        .forEach((el) => el.classList.add('visible'));
    });
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

  function initJoyGarden() {
    const button = qs('#joy-plant-button');
    const garden = qs('#joy-garden-plants');
    const message = qs('#joy-message');
    const count = qs('#joy-count');
    if (!button || !garden || !message || !count) return;

    const notes = [
      'Bạn không cần làm điều gì lớn lao để trở nên đáng quý.',
      'Mong hôm nay có một điều nhỏ khiến bạn mỉm cười.',
      'Những cố gắng thầm lặng của bạn vẫn luôn có ý nghĩa.',
      'Bạn xứng đáng được nghỉ ngơi và dịu dàng với chính mình.',
      'Cảm ơn bạn vì đã mang sự tử tế đến thế giới này.',
      'Cứ đi theo nhịp của bạn. Từng bước nhỏ cũng là tiến về phía trước.',
      'Mong bạn gặp được một niềm vui bất ngờ trong hôm nay.',
      'Sự hiện diện của bạn có thể làm ngày của ai đó tốt hơn.',
    ];
    const flowers = ['🌼', '🌷', '🌸', '🌻', '🪻', '🌺'];
    let seeds = 0;
    let bloomTimer = 0;

    function plantSeed() {
      seeds++;
      const flower = document.createElement('span');
      flower.className = 'joy-new-flower';
      flower.textContent = flowers[(seeds - 1) % flowers.length];
      flower.style.left = `${8 + Math.random() * 84}%`;
      flower.style.setProperty('--flower-delay', `${Math.random() * 0.25}s`);
      if (garden.children.length >= 24) garden.firstElementChild.remove();
      garden.appendChild(flower);
      count.textContent = String(seeds);
      message.textContent = notes[(seeds - 1) % notes.length];
      if (seeds === 1) {
        const icon = qs('.joy-message-icon');
        if (icon) icon.textContent = '🌼';
      }
      button.classList.remove('joy-button-bloom');
      requestAnimationFrame(() => button.classList.add('joy-button-bloom'));
      clearTimeout(bloomTimer);
      bloomTimer = setTimeout(() => button.classList.remove('joy-button-bloom'), 500);
    }

    button.addEventListener('click', plantSeed);
    onCleanup(() => {
      button.removeEventListener('click', plantSeed);
      clearTimeout(bloomTimer);
    });
  }

  function initHeroThreeScene() {
    const canvas = qs('[data-hero-3d]');
    const sceneType = canvas?.getAttribute('data-hero-3d');
    const artwork = sceneType === 'letter' ? canvas?.closest('.hero-bg')
      : sceneType === 'flower' ? canvas?.closest('.joy-hero-art')
        : sceneType === 'heart' ? canvas?.closest('.meaning-letter-art')
          : canvas?.closest('.about-hero');
    const interactionTarget = sceneType === 'letter' ? canvas?.closest('.hero') : artwork;
    if (!canvas || !artwork || prefersReducedMotion || isTouchDevice || compactViewport.matches) return;
    if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
      || (navigator.deviceMemory && navigator.deviceMemory <= 4)) return;

    let observer;
    let renderer;
    let animationFrame = 0;
    let isVisible = false;
    let isDisposed = false;
    let isLoadingScene = false;
    let sceneLoadFailed = false;
    let sceneLoadIdle = 0;
    let sceneLoadTimer = 0;
    function onCompactViewportChange() {
      if (compactViewport.matches) {
        artwork.classList.remove('has-3d-scene');
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previousFrameTime = 0;
      } else {
        if (renderer) artwork.classList.add('has-3d-scene');
        else scheduleSceneLoad();
        requestRender();
      }
    }
    let scene;
    let camera;
    let bloom;
    let heroObject;
    let pointerX = 0;
    let pointerY = 0;
    let scrollProgress = 0;
    let targetScrollProgress = 0;
    let elapsed = 0;
    let previousFrameTime = 0;

    function render(timestamp) {
      if (!renderer || !scene || !camera || !isVisible || document.hidden || isDisposed || compactViewport.matches) {
        animationFrame = 0;
        previousFrameTime = 0;
        return;
      }
      const delta = previousFrameTime ? Math.min(timestamp - previousFrameTime, 50) : 1000 / 60;
      previousFrameTime = timestamp;
      const frameScale = delta / (1000 / 60);
      const smoothing = 1 - Math.pow(1 - 0.025, frameScale);
      elapsed += frameScale * 0.01;
      heroObject.rotation.y += 0.0025 * frameScale;
      heroObject.position.y = Math.sin(elapsed) * 0.045;
      heroObject.rotation.x += (pointerY * 0.12 + targetScrollProgress * 0.18 - heroObject.rotation.x) * smoothing;
      heroObject.rotation.z += (pointerX * 0.16 - heroObject.rotation.z) * smoothing;
      camera.position.x += (pointerX * 0.22 - camera.position.x) * smoothing;
      camera.position.y += (-pointerY * 0.16 - targetScrollProgress * 0.12 - camera.position.y) * smoothing;
      camera.lookAt(0, 0, 0);
      if (bloom) bloom.rotation.z -= 0.0012 * frameScale;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    }

    function requestRender() {
      if (!animationFrame && isVisible && !document.hidden && !isDisposed && !compactViewport.matches) {
        animationFrame = requestAnimationFrame(render);
      }
    }

    function updateVisibility(entries) {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) {
        scheduleSceneLoad();
        requestRender();
      }
      else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previousFrameTime = 0;
      }
    }

    function updatePointer(event) {
      const bounds = interactionTarget.getBoundingClientRect();
      pointerX = clamp(((event.clientX - bounds.left) / bounds.width - 0.5) * 2, -1, 1);
      pointerY = clamp(((event.clientY - bounds.top) / bounds.height - 0.5) * 2, -1, 1);
    }

    function updateScroll() {
      const bounds = artwork.getBoundingClientRect();
      targetScrollProgress = clamp(-bounds.top / Math.max(window.innerHeight, 1), 0, 1);
    }

    function handleVisibilityChange() {
      if (document.hidden && animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        previousFrameTime = 0;
      } else {
        requestRender();
      }
    }

    function dispose() {
      isDisposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (sceneLoadIdle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(sceneLoadIdle);
      if (sceneLoadTimer) clearTimeout(sceneLoadTimer);
      if (observer) observer.disconnect();
      interactionTarget.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('scroll', updateScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      compactViewport.removeEventListener('change', onCompactViewportChange);
      if (renderer) {
        if (scene) {
          scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
        }
        renderer.dispose();
        renderer.forceContextLoss();
        artwork.classList.remove('has-3d-scene');
      }
    }

    observer = new IntersectionObserver(updateVisibility, { rootMargin: '160px 0px', threshold: 0 });
    observer.observe(artwork);
    compactViewport.addEventListener('change', onCompactViewportChange);
    interactionTarget.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    onCleanup(dispose);

    function scheduleSceneLoad() {
      if (isDisposed || !isVisible || renderer || isLoadingScene || sceneLoadFailed || sceneLoadIdle || sceneLoadTimer || compactViewport.matches) return;
      const load = () => {
        sceneLoadIdle = 0;
        sceneLoadTimer = 0;
        loadScene();
      };
      if (typeof window.requestIdleCallback === 'function') {
        sceneLoadIdle = window.requestIdleCallback(load, { timeout: 1200 });
      } else {
        sceneLoadTimer = window.setTimeout(load, 300);
      }
    }

    async function loadScene() {
      if (isDisposed || !isVisible || renderer || isLoadingScene || compactViewport.matches) return;
      isLoadingScene = true;
      try {
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
        if (isDisposed || compactViewport.matches) return;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            powerPreference: 'low-power',
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
          renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
          renderer.setClearColor(0x000000, 0);

          scene = new THREE.Scene();
          camera = new THREE.PerspectiveCamera(34, canvas.clientWidth / canvas.clientHeight, 0.1, 30);
          camera.position.z = 5.4;

          heroObject = new THREE.Group();
          scene.add(heroObject);
          if (sceneType === 'letter') {
            const envelope = new THREE.Group();
            const bodyShape = new THREE.Shape();
            bodyShape.moveTo(-0.95, -0.62);
            bodyShape.lineTo(0.95, -0.62);
            bodyShape.lineTo(0.95, 0.62);
            bodyShape.lineTo(-0.95, 0.62);
            bodyShape.closePath();
            const body = new THREE.Mesh(
              new THREE.ShapeGeometry(bodyShape),
              new THREE.MeshStandardMaterial({
                color: 0xf6d9e7,
                emissive: 0x61344f,
                emissiveIntensity: 0.22,
                roughness: 0.36,
                metalness: 0.12,
                side: THREE.DoubleSide,
              }),
            );
            envelope.add(body);

            const flapShape = new THREE.Shape();
            flapShape.moveTo(-0.94, 0.6);
            flapShape.lineTo(0.94, 0.6);
            flapShape.lineTo(0, -0.06);
            flapShape.closePath();
            const flap = new THREE.Mesh(
              new THREE.ShapeGeometry(flapShape),
              new THREE.MeshStandardMaterial({
                color: 0xffb8d2,
                emissive: 0x9a3e68,
                emissiveIntensity: 0.2,
                roughness: 0.3,
                metalness: 0.1,
                side: THREE.DoubleSide,
              }),
            );
            flap.position.z = 0.018;
            envelope.add(flap);

            const foldPoints = [
              new THREE.Vector3(-0.94, -0.6, 0.03), new THREE.Vector3(0, 0.06, 0.03),
              new THREE.Vector3(0.94, -0.6, 0.03),
            ];
            const foldGeometry = new THREE.BufferGeometry().setFromPoints(foldPoints);
            envelope.add(new THREE.Line(
              foldGeometry,
              new THREE.LineBasicMaterial({ color: 0xffe7f0, transparent: true, opacity: 0.75 }),
            ));

            const seal = new THREE.Mesh(
              new THREE.IcosahedronGeometry(0.18, 2),
              new THREE.MeshStandardMaterial({
                color: 0xff739f,
                emissive: 0xff4f81,
                emissiveIntensity: 0.55,
                roughness: 0.24,
                metalness: 0.18,
              }),
            );
            seal.position.set(0, -0.08, 0.1);
            seal.scale.set(1, 0.9, 0.55);
            envelope.add(seal);
            envelope.rotation.set(-0.12, -0.2, 0.12);
            heroObject.add(envelope);
            heroObject.position.x = 0.62;
            heroObject.scale.setScalar(0.78);
          } else if (sceneType === 'flower') {
            const petalColors = [0xff8db7, 0xd4a8ff, 0xffd2a0, 0xa899ff, 0xffacd0, 0x9edbd0];
            petalColors.forEach((color, index) => {
              const angle = (index / petalColors.length) * Math.PI * 2;
              const petal = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.32, 1),
                new THREE.MeshStandardMaterial({
                  color,
                  emissive: color,
                  emissiveIntensity: 0.22,
                  roughness: 0.35,
                  metalness: 0.16,
                  transparent: true,
                  opacity: 0.82,
                }),
              );
              petal.position.set(Math.cos(angle) * 0.68, Math.sin(angle) * 0.68, Math.sin(angle * 2) * 0.12);
              petal.scale.set(0.76, 1.28, 0.62);
              petal.rotation.z = angle - Math.PI / 2;
              heroObject.add(petal);
            });

            const core = new THREE.Mesh(
              new THREE.IcosahedronGeometry(0.34, 2),
              new THREE.MeshStandardMaterial({
                color: 0xffe6b9,
                emissive: 0xffa9cf,
                emissiveIntensity: 0.7,
                roughness: 0.22,
                metalness: 0.24,
              }),
            );
            heroObject.add(core);

            bloom = new THREE.Mesh(
              new THREE.TorusGeometry(1.18, 0.008, 4, 96),
              new THREE.MeshBasicMaterial({ color: 0xd5b6ff, transparent: true, opacity: 0.48 }),
            );
            bloom.rotation.x = Math.PI * 0.34;
            scene.add(bloom);
          } else if (sceneType === 'heart') {
            const heartShape = new THREE.Shape();
            heartShape.moveTo(0, -0.72);
            heartShape.bezierCurveTo(-0.22, -0.45, -0.92, 0.08, -0.92, 0.53);
            heartShape.bezierCurveTo(-0.92, 1.08, -0.2, 1.14, 0, 0.58);
            heartShape.bezierCurveTo(0.2, 1.14, 0.92, 1.08, 0.92, 0.53);
            heartShape.bezierCurveTo(0.92, 0.08, 0.22, -0.45, 0, -0.72);
            const heart = new THREE.Mesh(
              new THREE.ExtrudeGeometry(heartShape, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.07, bevelThickness: 0.07 }),
              new THREE.MeshStandardMaterial({
                color: 0xff8eb6,
                emissive: 0xb73571,
                emissiveIntensity: 0.38,
                roughness: 0.25,
                metalness: 0.16,
              }),
            );
            heart.position.z = -0.11;
            heroObject.add(heart);
            heroObject.scale.setScalar(0.58);
            bloom = new THREE.Mesh(
              new THREE.TorusGeometry(1.18, 0.008, 4, 96),
              new THREE.MeshBasicMaterial({ color: 0xffb8d2, transparent: true, opacity: 0.42 }),
            );
            bloom.rotation.x = Math.PI * 0.28;
            scene.add(bloom);
          } else {
            const globe = new THREE.Mesh(
              new THREE.SphereGeometry(0.92, 20, 14),
              new THREE.MeshBasicMaterial({ color: 0xb79aff, wireframe: true, transparent: true, opacity: 0.42 }),
            );
            heroObject.add(globe);
            const nodePositions = [];
            for (let latitude = -2; latitude <= 2; latitude++) {
              const phi = (latitude / 3) * Math.PI * 0.5;
              const ringSize = Math.max(4, Math.round(9 * Math.cos(phi)));
              for (let index = 0; index < ringSize; index++) {
                const theta = (index / ringSize) * Math.PI * 2 + (latitude % 2) * 0.16;
                nodePositions.push(
                  Math.cos(phi) * Math.cos(theta) * 0.96,
                  Math.sin(phi) * 0.96,
                  Math.cos(phi) * Math.sin(theta) * 0.96,
                );
              }
            }
            const nodeGeometry = new THREE.BufferGeometry();
            nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
            heroObject.add(new THREE.Points(
              nodeGeometry,
              new THREE.PointsMaterial({ color: 0xffa9ce, size: 0.055, transparent: true, opacity: 0.9 }),
            ));
            heroObject.scale.setScalar(0.9);
            heroObject.position.x = 1.45;
            bloom = new THREE.Mesh(
              new THREE.TorusGeometry(1.18, 0.008, 4, 96),
              new THREE.MeshBasicMaterial({ color: 0xd5b6ff, transparent: true, opacity: 0.36 }),
            );
            bloom.rotation.x = Math.PI * 0.34;
            bloom.position.x = 1.45;
            scene.add(bloom);
          }
          const innerOrbit = new THREE.Mesh(
            new THREE.TorusGeometry(sceneType === 'letter' || sceneType === 'connection' ? 1.18 : 0.94, 0.006, 4, 80),
            new THREE.MeshBasicMaterial({
              color: sceneType === 'connection' ? 0xbca6ff : 0xffb1d0,
              transparent: true,
              opacity: sceneType === 'letter' ? 0.16 : sceneType === 'connection' ? 0.28 : 0.32,
            }),
          );
          innerOrbit.rotation.set(-0.7, 0.24, 0.5);
          if (sceneType === 'letter') innerOrbit.position.x = 0.62;
          if (sceneType === 'connection') innerOrbit.position.x = 1.45;
          scene.add(innerOrbit);

          const particleCount = sceneType === 'letter' || sceneType === 'connection' ? 110 : 180;
          const positions = new Float32Array(particleCount * 3);
          for (let i = 0; i < particleCount; i++) {
            const radius = 1.3 + Math.random() * 1.5;
            const angle = Math.random() * Math.PI * 2;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
          }
          const particleGeometry = new THREE.BufferGeometry();
          particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          scene.add(new THREE.Points(
            particleGeometry,
            new THREE.PointsMaterial({ color: 0xffd4e5, size: 0.025, transparent: true, opacity: 0.62, sizeAttenuation: true }),
          ));

          scene.add(new THREE.AmbientLight(0xffffff, 1.15));
          const keyLight = new THREE.PointLight(0xffb6d2, 14, 8);
          keyLight.position.set(-2, 2, 3);
          scene.add(keyLight);
          const fillLight = new THREE.PointLight(0x9f8bff, 9, 8);
          fillLight.position.set(2, -1, 2);
          scene.add(fillLight);

          const resizeObserver = new ResizeObserver(() => {
            if (!renderer || !camera || isDisposed) return;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (!width || !height) return;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            requestRender();
          });
          resizeObserver.observe(artwork);
          onCleanup(() => resizeObserver.disconnect());

          artwork.classList.add('has-3d-scene');
          updateScroll();
          requestRender();
        } catch (error) {
          dispose();
          sceneLoadFailed = true;
          console.warn('3D hero scene could not be initialized; using the CSS illustration instead.', error);
        }
      } catch (error) {
        dispose();
        sceneLoadFailed = true;
        console.warn('Three.js could not be loaded; using the CSS illustration instead.', error);
      } finally {
        isLoadingScene = false;
        if (!sceneLoadFailed && !isDisposed && isVisible && !renderer && !compactViewport.matches) scheduleSceneLoad();
      }
    }
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
  let hasLoadedLetters = false;

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
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('toast-icon', 'vector-draw', 'vector-draw-ready', 'is-drawn');
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outline.setAttribute('cx', '12');
    outline.setAttribute('cy', '12');
    outline.setAttribute('r', '9');
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', 'currentColor');
    outline.setAttribute('stroke-width', '1.8');
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mark.classList.add('vector-draw__path');
    mark.setAttribute('pathLength', '1');
    mark.setAttribute('fill', 'none');
    mark.setAttribute('stroke', 'currentColor');
    mark.setAttribute('stroke-width', '1.8');
    mark.setAttribute('stroke-linecap', 'round');
    mark.setAttribute('stroke-linejoin', 'round');
    mark.setAttribute('d', type === 'error' ? 'M12 7v6m0 4h.01' : 'm7.5 12.5 3 3 6-7');
    icon.append(outline, mark);
    toast.replaceChildren(icon, document.createTextNode(message));
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
      const playStatus = qs('#play-status');
      if (playStatus) {
        playStatus.textContent = document.body.dataset.connection === 'offline'
          ? 'Ngoại tuyến · dữ liệu đã lưu'
          : 'Đang chờ tâm thư';
      }
      updateSlideshowControls();
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
      </article>`;

    if (info) info.textContent = `${index + 1} / ${letters.length}`;
    if (currentType) currentType.textContent = item.type;
    if (letterCount) animateCounter(letterCount, letters.length);

    const playStatus = qs('#play-status');
    if (playStatus) {
      playStatus.textContent = document.body.dataset.connection === 'offline'
        ? 'Ngoại tuyến · dữ liệu đã lưu'
        : letters.length > 1 && !slideshowPaused ? 'Đang phát' : 'Đã sẵn sàng';
    }
    updateSlideshowControls();

  }

  function updateSlideshowControls() {
    const canNavigate = letters.length > 1;
    [qs('#prev'), qs('#next')].forEach((button) => {
      if (button) button.disabled = !canNavigate;
    });
    const pauseButton = qs('#pause-slideshow');
    if (pauseButton) pauseButton.disabled = !canNavigate;
  }

  // ── API ──
  async function load() {
    let nextLetters;
    let isOnline = true;
    try {
      const response = await fetch(`/api/letters?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Letter service returned ${response.status}`);
      nextLetters = await response.json();
      if (!Array.isArray(nextLetters)) throw new Error('Letter service returned an invalid response');
    } catch (error) {
      nextLetters = localLetters();
      isOnline = false;
      if (document.body.dataset.connection !== 'offline') {
        console.warn('Could not refresh letters; showing the last locally saved copy.', error);
        notify('Không thể kết nối máy chủ. Đang hiển thị dữ liệu đã lưu.', 'error');
      }
    }
    const lettersChanged = JSON.stringify(nextLetters) !== JSON.stringify(letters);
    const connectionChanged = document.body.dataset.connection !== (isOnline ? 'online' : 'offline');
    letters = nextLetters;
    document.body.dataset.connection = isOnline ? 'online' : 'offline';
    if (isOnline) {
      try {
        saveLocal();
      } catch (error) {
        console.warn('Could not cache the latest letters in local storage.', error);
      }
    }
    if (index >= letters.length) index = Math.max(0, letters.length - 1);
    if (!hasLoadedLetters || lettersChanged || connectionChanged) {
      render();
      restart();
    }
    hasLoadedLetters = true;
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
    clearForm.onclick = () => {
      form.reset();
      count.textContent = '0';
      msgEl.focus();
    };
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!msgEl) return;
      const message = msgEl.value.trim();
      const words = wordCount(message);
      if (!message) { notify('Bạn hãy viết một lời nhắn trước nhé.', 'error'); msgEl.focus(); return; }
      if (words > 1000) { notify('Tâm thư chỉ được tối đa 1.000 từ.', 'error'); msgEl.focus(); return; }
      if (loading) return;
      loading = true;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        const label = qs('span', submitButton);
        if (label) label.textContent = 'Đang gửi...';
      }

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
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Không thể gửi tâm thư. Hãy thử lại sau.');
        if (!result || typeof result !== 'object' || typeof result.id === 'undefined') {
          throw new Error('Máy chủ trả về kết quả không hợp lệ. Tâm thư chưa được xác nhận.');
        }
        letters.push(result);
        index = letters.length - 1;
        form.reset();
        if (count) count.textContent = '0';
        document.body.dataset.connection = 'online';
        render();
        restart();
        notify('Đã gửi tâm thư thành công.');
        // Create spark burst
        createSparkBurst();
      } catch (error) {
        notify(error instanceof TypeError
          ? 'Không thể kết nối máy chủ. Tâm thư chưa được gửi.'
          : error.message, 'error');
      }
      loading = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        const label = qs('span', submitButton);
        if (label) label.textContent = 'Gửi tâm thư 💖';
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
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 80;
      spark.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      fx.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  }

  // ── Slideshow Controls ──
  const nextBtn = qs('#next');
  const prevBtn = qs('#prev');
  if (nextBtn) nextBtn.onclick = () => { next(); restart(); };
  if (prevBtn) prevBtn.onclick = () => { prev(); restart(); };

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
    presentationBtn.onclick = async () => {
      if (presentationBtn.disabled) return;
      if (typeof document.documentElement.requestFullscreen !== 'function') {
        notify('Trình duyệt này không hỗ trợ chế độ toàn màn hình.', 'error');
        return;
      }
      presentationBtn.disabled = true;
      presentationBtn.setAttribute('aria-busy', 'true');
      try {
        await document.documentElement.requestFullscreen();
        document.body.classList.add('presentation');
        presentationBtn.setAttribute('aria-pressed', 'true');
      } catch (error) {
        notify('Không thể mở chế độ toàn màn hình. Hãy kiểm tra quyền của trình duyệt.', 'error');
        console.warn('Could not enter fullscreen presentation mode.', error);
      } finally {
        presentationBtn.disabled = false;
        presentationBtn.removeAttribute('aria-busy');
      }
    };
  }
  document.addEventListener('fullscreenchange', () => {
    const isPresentation = Boolean(document.fullscreenElement);
    document.body.classList.toggle('presentation', isPresentation);
    if (presentationBtn) presentationBtn.setAttribute('aria-pressed', String(isPresentation));
  });

  // ── Music Controls ──
  function syncMusicControls(isPlaying) {
    const controls = [musicToggle, qs('#mobile-music-toggle')].filter(Boolean);
    controls.forEach((button) => {
      const isMobile = button.id === 'mobile-music-toggle';
      button.setAttribute('aria-pressed', String(isPlaying));
      if (isMobile) {
        button.textContent = isPlaying ? '⏸ Tắt nhạc' : '🎵 Bật nhạc';
      } else {
        const label = qs('.music-label', button);
        if (label) label.textContent = isPlaying ? 'Tắt nhạc' : 'Bật nhạc';
        button.classList.toggle('playing', isPlaying);
        const bars = qs('.music-bars', button);
        if (bars) bars.classList.toggle('paused', !isPlaying);
        if (isPlaying) createMusicBars(button);
      }
    });
  }

  function setupMusicToggle(button) {
    if (!button || !backgroundMusic) return;

    button.onclick = async () => {
      if (!backgroundMusic.paused) {
        backgroundMusic.pause();
        syncMusicControls(false);
        return;
      }
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        await backgroundMusic.play();
        syncMusicControls(true);
      } catch (error) {
        notify('Không thể phát file nhạc.', 'error');
        console.warn('Could not start background music.', error);
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    };
  }

  setupMusicToggle(musicToggle);
  setupMusicToggle(qs('#mobile-music-toggle'));

  // ── Keyboard Navigation ──
  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const isEditing = target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]');
    if (!isEditing && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
    }
    if (event.key === 'Escape') {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch((error) => {
          console.warn('Could not exit fullscreen presentation mode.', error);
          document.body.classList.remove('presentation');
        });
      } else {
        document.body.classList.remove('presentation');
      }
    }
  });

  // ── Online/Offline ──
  window.addEventListener('online', () => {
    load();
  });
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
    initVectorMotion();
    initMagneticButtons();
    initTiltCards();
    initPointerLighting();
    initClickFeedback();
    initNavigation();
    initParallax();
    initFloatingParticles();
    initScrollProgress();
    initFormEffects();
    if (isJoyPage) initJoyGarden();
    if (!isAdminPage) initHeroThreeScene();

    // GSAP (after script loads)
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      initGSAPAnimations();
    } else {
      // Wait for GSAP and ScrollTrigger to finish loading.
      window.addEventListener('load', () => {
        setTimeout(() => {
          initGSAPAnimations();
        }, 100);
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
