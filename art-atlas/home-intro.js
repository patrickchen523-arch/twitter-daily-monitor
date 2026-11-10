(() => {
  'use strict';
  if (window.CreativeHomeIntro) return;
  let activeDispose = null;
  let replayPending = false;
  const root = document.documentElement;
  if (location.pathname === '/' && !location.hash) root.classList.add('home-intro-home', 'home-intro-open');

  // Nuxt changes the URL with history methods during client-side navigation.
  // Clear the home-only color lock immediately when that happens, even after
  // the opening component has already disposed itself.
  const clearHomeClass = () => {
    if (location.pathname !== '/') root.classList.remove('home-intro-home');
  };
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    clearHomeClass();
    return result;
  };
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    clearHomeClass();
    return result;
  };
  window.addEventListener('popstate', clearHomeClass);

  function mount() {
    if (location.pathname !== '/') return;
    if (activeDispose) activeDispose();
    root.classList.add('home-intro-home', 'home-intro-open');
    const intro = document.createElement('section');
    intro.className = 'home-intro';
    intro.setAttribute('aria-label', '欢迎来到ART ATLAS');
    intro.innerHTML = `
      <div class="home-intro__curtain">
        <h1 class="home-intro__title" aria-label="ART ATLAS">
          <svg viewBox="0 0 1200 250" preserveAspectRatio="none" aria-hidden="true">
            <defs><pattern id="intro-art" patternUnits="userSpaceOnUse" width="1200" height="250">
              <image href="/gallery/media/big-walk/1.png" width="1200" height="650" y="-160" preserveAspectRatio="xMidYMid slice"/>
              <rect width="1200" height="250" fill="#e7e8e3" opacity=".64"/>
            </pattern></defs>
            <text x="0" y="237" textLength="1200" lengthAdjust="spacingAndGlyphs" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="310" font-weight="900" fill="url(#intro-art)">ART ATLAS</text>
          </svg>
        </h1>
      </div>
      <div class="home-intro__caption"><p class="home-intro__tagline">Explore Game Art.<br>Discover New Possibilities.</p><p class="home-intro__tagline-zh">探索游戏美术，发现创意可能。</p></div>
      <button class="home-intro__skip" type="button" aria-label="展开首页"><span>SCROLL TO EXPLORE</span><span aria-hidden="true">↓</span></button>
      <div class="home-intro__frame"></div>`;
    document.body.appendChild(intro);

    let closing = false, disposed = false, touchY = null, releaseTimer, finishTimer, revealTimer;
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 170 : 1050;
    const listeners = [];
    function listen(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      listeners.push(() => target.removeEventListener(event, handler, options));
    }
    function dispose() {
      if (disposed) { clearHomeClass(); return; }
      disposed = true;
      clearTimeout(releaseTimer); clearTimeout(finishTimer); clearTimeout(revealTimer);
      listeners.forEach(remove => remove());
      observer.disconnect();
      root.classList.remove('home-intro-open', 'home-intro-revealing');
      if (location.pathname !== '/') root.classList.remove('home-intro-home');
      intro.remove();
      if (activeDispose === dispose) activeDispose = null;
    }
    activeDispose = dispose;
    function dismiss() {
      if (closing || disposed) return;
      closing = true;
      intro.classList.add('is-closing');
      // Reveal only the title after the curtain leaves. The scene position is
      // independent of this class and remains stable throughout the visit.
      revealTimer = setTimeout(() => {
        if (disposed) return;
        root.classList.remove('home-intro-open');
        root.classList.add('home-intro-revealing');
      }, duration + 300);
      finishTimer = setTimeout(() => {
        intro.style.visibility = 'hidden';
        releaseTimer = setTimeout(dispose, 1150);
      }, duration);
    }
    function wheel(event) {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!closing && event.deltaY <= 0) return;
      // Consume the opening gesture so trackpad momentum cannot skip scene one.
      event.preventDefault();
      dismiss();
    }
    function keydown(event) {
      if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key) && !event.shiftKey) {
        event.preventDefault(); dismiss();
      } else if (event.key === 'Escape') dismiss();
    }
    listen(window, 'wheel', wheel, { passive:false, capture:true });
    listen(window, 'keydown', keydown, true);
    listen(window, 'touchstart', event => { touchY = event.touches[0]?.clientY; }, { passive:true });
    listen(window, 'touchmove', event => {
      if (touchY == null || event.touches.length !== 1) return;
      if (closing || touchY - event.touches[0].clientY > 12) {
        event.preventDefault(); dismiss();
      }
    }, { passive:false });
    listen(window, 'scroll', () => { if (window.scrollY > 16) dismiss(); }, { passive:true });
    listen(intro.querySelector('button'), 'click', dismiss);
    listen(document, 'click', event => {
      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href.startsWith('/') && href !== '/') {
        root.classList.remove('home-intro-home');
        dispose();
      }
    }, true);
    listen(window, 'popstate', () => { if (location.pathname !== '/') dispose(); });
    // Nuxt can navigate without reloading the document.
    const observer = new MutationObserver(() => { if (location.pathname !== '/') dispose(); });
    observer.observe(document.getElementById('__nuxt'), { childList:true, subtree:true });
  }
  // Keep each caption entirely inside the visible, diagonally clipped scene.
  // Scroll transforms move sections; caption placement uses their actual bounds.
  function placeCaptions() {
    if (location.pathname === '/') {
      const viewport = innerHeight;
      document.querySelectorAll('.index .section').forEach(section => {
        const caption = section.querySelector('.section__content>div[data-align]');
        if (!caption) return;
        const bounds = section.getBoundingClientRect();
        const right = caption.dataset.align === 'right';
        const height = caption.offsetHeight;
        const clip = getComputedStyle(section).clipPath;
        const slope = /100%\s+([\d.]+)%/.exec(clip);
        const diagonal = slope ? Number(slope[1]) / 100 : 0;
        const x = right ? .92 : Math.min(.9, .084 + caption.offsetWidth / innerWidth);
        const top = Math.max(125, bounds.top + bounds.height * diagonal * x + 28);
        let bottom = Math.min(viewport - (innerWidth <= 700 ? 65 : 90), bounds.bottom - 45);
        const next = section.nextElementSibling;
        if (next?.classList.contains('section')) {
          const nextBounds = next.getBoundingClientRect();
          const nextSlope = /100%\s+([\d.]+)%/.exec(getComputedStyle(next).clipPath);
          const leftX = right ? Math.max(0, .916 - caption.offsetWidth / innerWidth) : .08;
          bottom = Math.min(bottom, nextBounds.top + nextBounds.height * (nextSlope ? Number(nextSlope[1]) / 100 : 0) * leftX - 28);
        }
        const fits = bottom - top >= height;
        caption.style.visibility = fits ? '' : 'hidden';
        const desired = right ? top : bottom - height;
        caption.style.top = Math.max(0, desired - bounds.top) + 'px';
      });
    }
    requestAnimationFrame(placeCaptions);
  }
  requestAnimationFrame(placeCaptions);
  function resetScroll() {
    window.scrollTo(0, 0);
    const visit = component => {
      if (!component) return;
      if (component.dom && typeof component.current === 'number') {
        component.current = component.target = component.last = component.previous = 0;
        component._onRequestAnimationFrame?.();
      }
      (component.$children || []).forEach(visit);
    };
    visit(window.$nuxt);
  }
  async function replay() {
    if (replayPending) return;
    replayPending = true;
    try {
      if (activeDispose) activeDispose();
      const app = window.$nuxt;
      if (location.pathname !== '/') {
        await app.$router.push('/');
        await new Promise(resolve => setTimeout(resolve, 1600));
      }
      resetScroll();
      await new Promise(requestAnimationFrame);
      mount();
    } finally { replayPending = false; }
  }
  window.CreativeHomeIntro = { replay };
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!event.target.closest('.header__logo')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    replay();
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else if (location.pathname === '/' && !location.hash) mount();
})();
