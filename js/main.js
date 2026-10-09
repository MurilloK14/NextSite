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
  const isMobileInitial = window.innerWidth <= 768;
  const FRAME_STEP = isMobileInitial ? 2 : 1;
  const images = new Array(FRAME_COUNT);
  const framePath = i => `animacao/ezgif-frame-${String(i + 1).padStart(3, '0')}.webp`;

  // --- DOM refs cached once ---
  const wrapper       = document.querySelector('.seq-wrapper');
  const darkOverlay   = document.querySelector('.seq-dark-overlay');
  const introGroup    = document.getElementById('seq-intro');
  const titleEl       = introGroup && introGroup.querySelector('.seq-main-title');
  const preTitle      = introGroup && introGroup.querySelector('.seq-pre-title');
  const seqBtn        = introGroup && introGroup.querySelector('.seq-btn');
  const loadingEl     = document.getElementById('seq-loading');
  const cards         = Array.from(document.querySelectorAll('.seq-card'));
  const floatingWaBtn = document.querySelector('.floating-whatsapp');

  // --- State ---
  let canvasW = 0, canvasH = 0;
  let drawX = 0, drawY = 0, drawW = 0, drawH = 0;
  let imgW = 0, imgH = 0;
  let targetP = 0, currentP = 0;
  let lastFrameIdx = -1;

  const clamp   = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const between = (p, a, b)   => clamp((p - a) / (b - a), 0, 1);
  const easeOut = t => 1 - (1 - t) ** 3;

  // --- Canvas sizing & positioning ---
  function computeRect() {
    if (!imgW || !imgH) return;
    const isMobile = canvasW <= 768;
    if (isMobile) {
      // Scale notebook so it is prominent, crisp and close without clipping
      const s = Math.min((canvasW / imgW) * 1.48, (canvasH / imgH) * 0.58);
      drawW = imgW * s;
      drawH = imgH * s;
      drawX = (canvasW - drawW) / 2;

      // Position notebook comfortably below the intro heading & CTA
      // Header is ~68px, intro text is ~200px, so top clearance is ~268px
      const topClearance = 68 + 180;
      const availableSpace = canvasH - topClearance;
      drawY = topClearance + Math.max(0, (availableSpace - drawH) * 0.35);
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
    const isMobile = window.innerWidth <= 768;
    // Cap DPR at 1.5 on mobile to avoid GPU memory overhead and maintain 60fps
    const maxDpr = isMobile ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    canvas.width  = Math.floor(canvasW * dpr);
    canvas.height = Math.floor(canvasH * dpr);
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = canvasH + 'px';
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';
    computeRect();
    lastFrameIdx = -1;
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // Priority queue: Load Frame 0 FIRST so user sees initial frame immediately
  function onFrameReady(i, bmp) {
    images[i] = bmp;
    if (i === 0) {
      imgW = bmp.width || bmp.naturalWidth || 1920;
      imgH = bmp.height || bmp.naturalHeight || 1080;
      resizeCanvas();
      drawSequenceFrame(bmp);
      lastFrameIdx = 0;
      if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 200);
      }
    }
  }

  // Load first frame immediately
  const firstImg = new Image();
  firstImg.onload = () => {
    if (window.createImageBitmap) {
      createImageBitmap(firstImg)
        .then(bmp => onFrameReady(0, bmp))
        .catch(() => onFrameReady(0, firstImg));
    } else {
      onFrameReady(0, firstImg);
    }
    startRemainingQueue();
  };
  firstImg.onerror = () => {
    startRemainingQueue();
  };
  firstImg.src = framePath(0);

  // Background loading queue: On mobile, step by 2 frames (50% less data & memory)
  function startRemainingQueue() {
    const isMobile = window.innerWidth <= 768;
    const step = isMobile ? 2 : 1;
    let nextIdx = step;
    const CONCURRENT = isMobile ? 4 : 6;

    function loadNext() {
      if (nextIdx >= FRAME_COUNT) return;
      const i = nextIdx;
      nextIdx += step;

      const img = new Image();
      img.onload = () => {
        if (window.createImageBitmap) {
          createImageBitmap(img)
            .then(bmp => onFrameReady(i, bmp))
            .catch(() => onFrameReady(i, img));
        } else {
          onFrameReady(i, img);
        }
        loadNext();
      };
      img.onerror = () => {
        images[i] = null;
        loadNext();
      };
      img.src = framePath(i);
    }

    for (let c = 0; c < CONCURRENT; c++) {
      loadNext();
    }
  }

  // --- Scroll Progress ---
  function readScroll() {
    if (!wrapper) return;
    const max = wrapper.offsetHeight - window.innerHeight;
    if (max <= 0) return;
    targetP = clamp(-wrapper.getBoundingClientRect().top / max, 0, 1);
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // --- Main Animation Loop ---
  function loop() {
    requestAnimationFrame(loop);

    // Lerp toward target
    const diff = targetP - currentP;
    if (Math.abs(diff) > 0.0001) {
      currentP += diff * 0.25;
    } else {
      currentP = targetP;
    }

    const p = currentP;

    // -- Frame rendering --
    const wantRaw = Math.min(FRAME_COUNT - 1, Math.floor(between(p, 0, 0.95) * FRAME_COUNT));
    const isMobile = window.innerWidth <= 768;
    const wantFrame = (isMobile && FRAME_STEP === 2) ? wantRaw - (wantRaw % 2) : wantRaw;

    if (wantFrame !== lastFrameIdx) {
      let fi = wantFrame;
      const step = isMobile ? 2 : 1;
      while (fi >= 0 && !images[fi]) fi -= step;
      if (fi < 0) {
        fi = 0;
        while (fi < FRAME_COUNT && !images[fi]) fi += step;
      }
      if (images[fi]) {
        drawSequenceFrame(images[fi]);
        lastFrameIdx = wantFrame;
      }
    }

    // -- Canvas fade (transition to services section) --
    const fade = between(p, 0.92, 1.0);
    canvas.style.opacity  = String(1 - fade);
    darkOverlay.style.opacity = String(fade);

    // -- Intro texts: visible at start, fade out as notebook begins opening --
    const tOut = between(p, 0.04, 0.16);
    if (preTitle) {
      preTitle.style.opacity   = 1 - tOut;
      preTitle.style.transform = `translateY(${-easeOut(tOut) * 30}px)`;
    }
    if (titleEl) {
      const titleOut = between(p, 0.06, 0.18);
      titleEl.style.opacity   = 1 - titleOut;
      titleEl.style.transform = `translateY(${-easeOut(titleOut) * 30}px)`;
    }
    if (seqBtn) {
      const btnOut = between(p, 0.08, 0.20);
      seqBtn.style.opacity   = 1 - btnOut;
      seqBtn.style.transform = `translateY(${-easeOut(btnOut) * 30}px)`;
    }

    // -- Satellite glass cards --
    if (isMobile) {
      // Coordinated timing with ample reading dwell time
      const ranges = [
        { start: 0.20, peakIn: 0.26, peakOut: 0.40, end: 0.46 },
        { start: 0.44, peakIn: 0.50, peakOut: 0.64, end: 0.70 },
        { start: 0.68, peakIn: 0.74, peakOut: 0.88, end: 0.94 }
      ];

      cards.forEach((card, i) => {
        const r = ranges[i] || ranges[0];
        const fadeIn = between(p, r.start, r.peakIn);
        const fadeOut = between(p, r.peakOut, r.end);
        const a = clamp(fadeIn - fadeOut, 0, 1);
        const ty = (1 - easeOut(fadeIn)) * 14 - (fadeOut * 14);

        card.style.opacity = a;
        card.style.pointerEvents = a > 0.1 ? 'auto' : 'none';
        card.style.transform = `translate(-50%, ${ty}px)`;
      });

      // Keep floating WhatsApp button hidden while hero sequence cards are in view
      if (floatingWaBtn) {
        if (p < 0.90) {
          floatingWaBtn.classList.add('is-hidden');
        } else {
          floatingWaBtn.classList.remove('is-hidden');
        }
      }
    } else {
      cards.forEach((card, i) => {
        const stagger = i * 0.02;
        const cardIn  = between(p, 0.40 + stagger, 0.55 + stagger);
        const cardOut = between(p, 0.92, 0.98);
        const a       = clamp(cardIn - cardOut, 0, 1);
        card.style.opacity       = a;
        card.style.pointerEvents = a > 0.05 ? 'auto' : 'none';
        const dir = card.classList.contains('card-left') ? -1 : 1;
        card.style.transform = `translateX(${dir * (1 - easeOut(cardIn)) * 24}px)`;
      });
    }
  }

  requestAnimationFrame(loop);
}


/* =====================================================
   HEADER OBSERVER (Frosted Glass on Scroll)
   ===================================================== */
function initHeaderObserver() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled', 'header-dark');
    } else {
      header.classList.remove('scrolled');
      header.classList.add('header-dark');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


/* =====================================================
   MOBILE MENU (Animated, Ergonomic & Accessible)
   ===================================================== */
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const overlay = document.getElementById('mobile-nav');
  const floatingWa = document.querySelector('.floating-whatsapp');
  if (!btn || !overlay) return;

  const links = overlay.querySelectorAll('.mobile-nav-link, .btn');

  const closeMenu = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (floatingWa) floatingWa.classList.remove('is-hidden');
  };

  const openMenu = () => {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (floatingWa) floatingWa.classList.add('is-hidden');
  };

  const toggleMenu = () => {
    if (overlay.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  btn.addEventListener('click', toggleMenu);
  links.forEach(link => link.addEventListener('click', closeMenu));

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Close on backdrop tap
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMenu();
  });
}


/* =====================================================
   FAQ (GPU Accelerated, Layout-Thrash Free)
   ===================================================== */
function initFaq() {
  const faqItems = document.querySelectorAll('.faq-question');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isExpanded = item.getAttribute('aria-expanded') === 'true';
      const parentCard = item.closest('.faq-item');

      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.setAttribute('aria-expanded', 'false');
          const otherCard = otherItem.closest('.faq-item');
          if (otherCard) otherCard.classList.remove('is-active');
        }
      });

      item.setAttribute('aria-expanded', !isExpanded);
      if (parentCard) parentCard.classList.toggle('is-active', !isExpanded);
    });
  });
}


/* =====================================================
   CALCULATOR (With Instant Mobile Sticky Summary)
   ===================================================== */
function initCalculator() {
  const form = document.getElementById('calc-form');
  const resultValue = document.getElementById('calc-result-value');
  const btnCalc = document.getElementById('calc-btn-cta');
  const mobileSummary = document.getElementById('calc-mobile-summary');
  const mobilePrice = document.getElementById('calc-mobile-price');
  const btnCalcMobile = document.getElementById('calc-btn-mobile-cta');
  const floatingWa = document.querySelector('.floating-whatsapp');

  if (!form || !resultValue || !btnCalc) return;

  const typeConfig = {
    landing_page: {
      name: 'Landing Page (Página Única Comercial)',
      base: 350
    },
    institucional: {
      name: 'Site Institucional / Corporativo Múltiplo',
      base: 900
    },
    ecommerce: {
      name: 'E-commerce / Sistema Web Sob Medida',
      base: 1500
    }
  };

  const addonConfig = {
    blog: { name: 'Área de Publicações / Blog', price: 200 },
    multilingue: { name: 'Arquitetura Multi-idioma', price: 300 },
    agendamento: { name: 'Sistema de Agendamento Nativo', price: 250 }
  };

  const calculate = () => {
    const data = new FormData(form);
    const typeKey = data.get('project_type') || 'landing_page';
    const typeInfo = typeConfig[typeKey] || typeConfig.landing_page;
    let total = typeInfo.base;

    const selectedAddons = data.getAll('addon');
    const addonNames = [];

    selectedAddons.forEach(addonKey => {
      if (addonConfig[addonKey]) {
        total += addonConfig[addonKey].price;
        addonNames.push(`${addonConfig[addonKey].name} (+R$ ${addonConfig[addonKey].price})`);
      }
    });

    const formattedPrice = `R$ ${total.toLocaleString('pt-BR')}`;
    resultValue.textContent = formattedPrice;
    if (mobilePrice) mobilePrice.textContent = formattedPrice;

    resultValue.classList.remove('val-pop');
    void resultValue.offsetWidth;
    resultValue.classList.add('val-pop');

    // Mensagem contextual para o WhatsApp
    let msg = `Olá, NextSite! Fiz uma simulação no site e escolhi a seguinte configuração:\n\n`;
    msg += `🚀 *Tipo de Site:* ${typeInfo.name}\n`;
    if (addonNames.length > 0) {
      msg += `🧩 *Módulos Extras:* ${addonNames.join(', ')}\n`;
    }
    msg += `💰 *Investimento Estimado:* ${formattedPrice}\n\n`;
    msg += `Gostaria de entender melhor os prazos de entrega e como podemos iniciar o projeto!`;

    btnCalc.dataset.message = msg;
    if (btnCalcMobile) btnCalcMobile.dataset.message = msg;
  };

  form.addEventListener('change', calculate);
  form.addEventListener('input', calculate);
  calculate();

  // Mobile Sticky Summary visibility observer
  const calcSection = document.getElementById('orcamento');
  if (calcSection && mobileSummary) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (window.innerWidth <= 768) {
          if (entry.isIntersecting) {
            mobileSummary.classList.add('is-visible');
            if (floatingWa) floatingWa.classList.add('is-hidden');
          } else {
            mobileSummary.classList.remove('is-visible');
            if (floatingWa && window.scrollY > 400) floatingWa.classList.remove('is-hidden');
          }
        }
      });
    }, { rootMargin: '-10% 0px -10% 0px', threshold: 0.1 });

    observer.observe(calcSection);
  }
}


/* =====================================================
   WHATSAPP BUTTONS HANDLER
   ===================================================== */
function initWhatsAppButtons() {
  const WHATSAPP_NUMBER = '5587981329735';
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

const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


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
  }, { rootMargin: '0px 0px -60px 0px' });
  
  reveals.forEach(el => observer.observe(el));
}


/* =====================================================
   BACKGROUND VIDEO INITIALIZER (Power & Battery Friendly)
   ===================================================== */
function initBgVideo() {
  const v = document.querySelector('.dark-video-bg');
  const zone = document.querySelector('.dark-showcase-zone');
  if (!v) return;

  v.muted = true;

  if (zone && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.05 });

    observer.observe(zone);
  } else {
    v.play().catch(() => {});
  }
}
