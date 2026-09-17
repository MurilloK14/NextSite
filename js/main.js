document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaq();
  initCalculator();
  initWhatsAppButtons();
  initScrollSequence();
  initHeaderObserver();
  initBgVideo();
  initScrollReveal();
});

function initScrollSequence() {
  const canvas = document.getElementById('seq-canvas');
  if (!canvas) return;

  // Alpha false = opaque, faster compositing
  const ctx = canvas.getContext('2d', { alpha: false });

  const FRAME_COUNT = 208;
  const images = new Array(FRAME_COUNT);
  const framePath = i => `animacao/ezgif-frame-${String(i + 1).padStart(3, '0')}.webp`;

  // --- DOM refs cached once ---
  const wrapper     = document.querySelector('.seq-wrapper');
  const darkOverlay = document.querySelector('.seq-dark-overlay');
  const introGroup  = document.getElementById('seq-intro');
  const titleEl     = introGroup && introGroup.querySelector('.seq-main-title');
  const preTitle    = introGroup && introGroup.querySelector('.seq-pre-title');
  const seqBtn      = introGroup && introGroup.querySelector('.seq-btn');
  const loadingEl   = document.getElementById('seq-loading');
  const cards       = Array.from(document.querySelectorAll('.seq-card'));

  // --- State ---
  let canvasW = 0, canvasH = 0;
  let drawX = 0, drawY = 0, drawW = 0, drawH = 0;
  let imgW = 0, imgH = 0;
  let targetP = 0, currentP = 0;
  let lastFrameIdx = -1;
  let highestLoaded = -1; // track highest consecutive loaded frame

  const clamp   = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const between = (p, a, b)   => clamp((p - a) / (b - a), 0, 1);
  const easeOut = t => 1 - (1 - t) ** 3;

  // --- Canvas sizing ---
  function computeRect() {
    if (!imgW || !imgH) return;
    const isMobile = canvasW <= 768;
    if (isMobile) {
      // Scale notebook so it is prominent, crisp and close (~88% of mobile width)
      // without being clipped horizontally during rotation
      const s = (canvasW / imgW) * 1.62;
      drawW = imgW * s;
      drawH = imgH * s;
      drawX = (canvasW - drawW) / 2;
      drawY = (canvasH - drawH) / 2;
    } else {
      const s = Math.max(canvasW / imgW, canvasH / imgH);
      drawW = imgW * s;
      drawH = imgH * s;
      drawX = (canvasW - drawW) / 2;
      drawY = (canvasH - drawH) / 2;
    }
  }

  function drawSequenceFrame(img) {
    if (!img) return;
    if (canvasW <= 768) {
      ctx.fillStyle = '#080714';
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    if (canvasW <= 768 && drawH < canvasH) {
      const featherH = Math.min(48, drawH * 0.15);
      // Top soft blend
      const topGrad = ctx.createLinearGradient(0, drawY - 1, 0, drawY + featherH);
      topGrad.addColorStop(0, '#080714');
      topGrad.addColorStop(1, 'rgba(8, 7, 20, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, drawY - 1, canvasW, featherH + 1);

      // Bottom soft blend
      const botGrad = ctx.createLinearGradient(0, drawY + drawH - featherH, 0, drawY + drawH + 1);
      botGrad.addColorStop(0, 'rgba(8, 7, 20, 0)');
      botGrad.addColorStop(1, '#080714');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, drawY + drawH - featherH, canvasW, featherH + 1);
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width  = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.scale(dpr, dpr);
    // Setup for maximum visual quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    computeRect();
    lastFrameIdx = -1; // force redraw after resize
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // --- Load images: sequential queue with async decode ---
  let loadIdx = 0, loadedCount = 0;
  const CONCURRENT = 6;

  function onFrameReady(i, bmp) {
    images[i] = bmp;
    loadedCount++;

    // Track highest consecutive loaded for fallback
    if (i === highestLoaded + 1) {
      highestLoaded = i;
      while (images[highestLoaded + 1]) highestLoaded++;
    }

    if (i === 0) {
      imgW = bmp.width || bmp.naturalWidth || 0;
      imgH = bmp.height || bmp.naturalHeight || 0;
      resizeCanvas();
      // draw frame 0 immediately
      if (imgW && imgH) {
        drawSequenceFrame(bmp);
      }
      lastFrameIdx = 0;
    }

    if (loadedCount === 12 && loadingEl) {
      loadingEl.style.opacity = '0';
      setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 600);
    }
    loadNext();
  }

  function loadNext() {
    if (loadIdx >= FRAME_COUNT) return;
    const i = loadIdx++;
    const img = new Image();
    img.onload = () => {
      if (window.createImageBitmap) {
        createImageBitmap(img)
          .then(bmp => onFrameReady(i, bmp))
          .catch(() => onFrameReady(i, img));
      } else {
        onFrameReady(i, img);
      }
    };
    img.onerror = () => {
      images[i] = null;
      loadedCount++;
      loadNext();
    };
    img.src = framePath(i);
  }

  for (let i = 0; i < CONCURRENT; i++) loadNext();

  // --- Scroll ---
  function readScroll() {
    if (!wrapper) return;
    const max = wrapper.offsetHeight - window.innerHeight;
    if (max <= 0) return;
    targetP = clamp(-wrapper.getBoundingClientRect().top / max, 0, 1);
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // --- Main loop: always running, cheap when idle ---
  function loop() {
    requestAnimationFrame(loop);

    // Lerp toward target
    const diff = targetP - currentP;
    if (Math.abs(diff) > 0.0001) {
      currentP += diff * 0.25; // 0.25 = smooth but responsive
    } else {
      currentP = targetP;
    }

    const p = currentP;

    // -- Frame rendering (Notebook smoothly opens in slow motion across the whole scroll track) --
    const wantFrame = Math.min(FRAME_COUNT - 1, Math.floor(between(p, 0, 0.95) * FRAME_COUNT));
    if (wantFrame !== lastFrameIdx) {
      // Find best available frame (exact or nearest loaded below)
      let fi = wantFrame;
      while (fi >= 0 && !images[fi]) fi--;
      if (fi >= 0 && images[fi]) {
        drawSequenceFrame(images[fi]);
        lastFrameIdx = wantFrame; // mark as rendered even if fallback, prevents flicker
      }
    }

    // -- Canvas fade (transition to services section) --
    const fade = between(p, 0.95, 1.0);
    canvas.style.opacity  = String(1 - fade);
    darkOverlay.style.opacity = String(fade);

    // -- Intro texts: visible at start, fade out as notebook begins opening --
    const tOut = between(p, 0.05, 0.15);
    if (preTitle) {
      preTitle.style.opacity   = 1 - tOut;
      preTitle.style.transform = `translateY(${-easeOut(tOut) * 40}px)`;
    }
    if (titleEl) {
      const titleOut = between(p, 0.08, 0.18);
      titleEl.style.opacity   = 1 - titleOut;
      titleEl.style.transform = `translateY(${-easeOut(titleOut) * 40}px)`;
    }
    if (seqBtn) {
      const btnOut = between(p, 0.11, 0.21);
      seqBtn.style.opacity   = 1 - btnOut;
      seqBtn.style.transform = `translateY(${-easeOut(btnOut) * 40}px)`;
    }

    // -- Satellite glass cards (appear while notebook is opening, disappear at very end) --
    const isMobile = window.innerWidth <= 768;

    cards.forEach((card, i) => {
      if (isMobile) {
        // Mobile: sequential clean cycle (one card at a time in the bottom thumb zone)
        const start = 0.28 + i * 0.22;
        const peakIn = start + 0.06;
        const peakOut = start + 0.16;
        const end = start + 0.22;

        const fadeIn = between(p, start, peakIn);
        const fadeOut = between(p, peakOut, end);
        const a = clamp(fadeIn - fadeOut, 0, 1);
        const ty = (1 - easeOut(fadeIn)) * 14 - (fadeOut * 14);

        card.style.opacity = a;
        card.style.pointerEvents = a > 0.1 ? 'auto' : 'none';
        card.style.transform = `translate(-50%, ${ty}px)`;
      } else {
        // Desktop: floating cards positioned around notebook
        const stagger = i * 0.02;
        const cardIn  = between(p, 0.40 + stagger, 0.55 + stagger);
        const cardOut = between(p, 0.92, 0.98);
        const a       = clamp(cardIn - cardOut, 0, 1);
        card.style.opacity       = a;
        card.style.pointerEvents = a > 0.05 ? 'auto' : 'none';
        const dir = card.classList.contains('card-left') ? -1 : 1;
        card.style.transform = `translateX(${dir * (1 - easeOut(cardIn)) * 24}px)`;
      }
    });
  }

  requestAnimationFrame(loop);
}



/* =====================================================
   HEADER OBSERVER (Dark/Light mode auto switch)
   ===================================================== */
function initHeaderObserver() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const observer = new IntersectionObserver((entries) => {
    let isDarkThemeInView = false;
    
    // Check if any element with 'theme-dark' is actively crossing the header zone
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target.classList.contains('theme-dark')) {
        isDarkThemeInView = true;
      }
    });

    if (isDarkThemeInView) {
      header.classList.add('header-dark');
    } else {
      // Only remove if we're sure we're in a light section.
      // A more robust way is to observe all sections and find the one at scroll Y.
    }
  }, {
    // Trigger when the element reaches the top of the viewport
    rootMargin: '-10% 0px -90% 0px' 
  });

  // A more reliable way: check DOM element at point
  window.addEventListener('scroll', () => {
    const headerHeight = header.offsetHeight;
    const elem = document.elementFromPoint(window.innerWidth / 2, headerHeight + 10);
    if (elem) {
      const section = elem.closest('section, footer');
      if (section && section.classList.contains('theme-dark')) {
        header.classList.add('header-dark');
      } else if (section && section.classList.contains('theme-light')) {
        header.classList.remove('header-dark');
      }
    }
  }, { passive: true });
}


/* =====================================================
   EXISTING FEATURES (preserved)
   ===================================================== */

function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  if (btn) {
    const overlay = document.getElementById('mobile-nav');
    const links = overlay.querySelectorAll('.mobile-nav-link, .btn');

    const toggleMenu = () => {
      const isOpen = overlay.classList.contains('is-open');
      if (isOpen) {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      } else {
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
      }
    };

    btn.addEventListener('click', toggleMenu);
    links.forEach(link => {
      link.addEventListener('click', () => {
        if (overlay.classList.contains('is-open')) toggleMenu();
      });
    });
  }
}

function initFaq() {
  const faqItems = document.querySelectorAll('.faq-question');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isExpanded = item.getAttribute('aria-expanded') === 'true';
      const answer = item.nextElementSibling;
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.setAttribute('aria-expanded', 'false');
          otherItem.nextElementSibling.style.maxHeight = null;
        }
      });
      item.setAttribute('aria-expanded', !isExpanded);
      if (!isExpanded) answer.style.maxHeight = answer.scrollHeight + "px";
      else answer.style.maxHeight = null;
    });
  });
}

function initCalculator() {
  const form = document.getElementById('calc-form');
  const resultValue = document.getElementById('calc-result-value');
  const btnCalc = document.getElementById('calc-btn-cta');

  if (!form || !resultValue || !btnCalc) return;

  const calculate = () => {
    const data = new FormData(form);
    let total = 0;
    const type = data.get('project_type');

    if (type === 'landing_page') total += 350;
    else if (type === 'institucional') total += 900;
    else if (type === 'ecommerce') total += 1500;

    const addons = data.getAll('addon');
    if (addons.includes('blog')) total += 200;
    if (addons.includes('multilingue')) total += 300;
    if (addons.includes('agendamento')) total += 250;

    resultValue.textContent = `R$ ${total}`;
    const typeLabel = { 'landing_page': 'Landing Page', 'institucional': 'Site Institucional', 'ecommerce': 'E-commerce' }[type] || 'Site';
    btnCalc.dataset.message = `Olá! Gostaria de solicitar um orçamento para um(a) ${typeLabel}. A estimativa apresentada foi de R$ ${total}.`;
  };

  form.addEventListener('change', calculate);
  calculate();
}

function initWhatsAppButtons() {
  const WHATSAPP_NUMBER = '5587981329735';
  if (WHATSAPP_NUMBER === '5500000000000') {
    console.warn("⚠️ [NextSite] O número de WhatsApp configurado é um placeholder ('5500000000000'). Os CTAs não funcionarão corretamente. Substitua-o no arquivo main.js.");
  }
  const buttons = document.querySelectorAll('.btn-whatsapp');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const customMessage = btn.dataset.message || "Olá! Gostaria de conversar sobre a criação de um site para o meu negócio.";
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(customMessage)}`;
      window.open(url, '_blank');
    });
  });
}

document.getElementById('footer-year').textContent = new Date().getFullYear();

/* =====================================================
   SCROLL REVEAL OBSERVER
   ===================================================== */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { rootMargin: '0px 0px -100px 0px' });
  
  reveals.forEach(el => observer.observe(el));
}

/* =====================================================
   BACKGROUND VIDEO INITIALIZER
   ===================================================== */
function initBgVideo() {
  const v = document.querySelector('.dark-video-bg');
  if (v) {
    v.muted = true;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Retry on user interaction if browser strictly blocks autoplay
        const onFirstTouch = () => {
          v.play().catch(() => {});
          window.removeEventListener('touchstart', onFirstTouch);
          window.removeEventListener('scroll', onFirstTouch);
          window.removeEventListener('click', onFirstTouch);
        };
        window.addEventListener('touchstart', onFirstTouch, { passive: true });
        window.addEventListener('scroll', onFirstTouch, { passive: true });
        window.addEventListener('click', onFirstTouch, { passive: true });
      });
    }
  }
}

