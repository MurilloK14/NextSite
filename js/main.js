document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaq();
  initCalculator();
  initWhatsAppButtons();
  initScrollSequence();
  initHeaderObserver();
});

/* =====================================================
   HERO SEQUENCE — Image Canvas & Scroll Sync
   ===================================================== */
function initScrollSequence() {
  const canvas = document.getElementById('seq-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false }); // optimizes performance
  
  const frameCount = 225; // Total frames (updated for higher FPS)
  const images = [];
  
  // Format: animação/ezgif-frame-001.jpg
  const imageSeqPath = index => `animação/ezgif-frame-${(index + 1).toString().padStart(3, '0')}.jpg`;
  
  let lastFrameIndex = -1;
  let canvasW = 0;
  let canvasH = 0;
  
  function resizeCanvas() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    
    // Suporte a monitores Retina / High-DPI para qualidade máxima
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    
    // Ajusta a escala do contexto e aplica filtros de alta qualidade
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (lastFrameIndex >= 0) {
      renderFrame(lastFrameIndex, true);
    }
  }
  
  window.addEventListener('resize', resizeCanvas);
  
  // Preload images
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.onload = () => {
      // Once the first image loads, trigger a resize/render to show it immediately
      if (i === 0 && lastFrameIndex === -1) {
        resizeCanvas();
      }
    };
    img.src = imageSeqPath(i);
    images.push(img);
  }
  
  // Draw the frame with object-fit: cover logic
  function renderFrame(index, force = false) {
    if (index === lastFrameIndex && !force) return;
    const img = images[index];
    if (!img || !img.complete) return;
    
    lastFrameIndex = index;
    const iw = img.width;
    const ih = img.height;
    
    // Calculate cover dimensions using logical viewport sizes
    const scale = Math.max(canvasW / iw, canvasH / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (canvasW - w) / 2;
    const y = (canvasH - h) / 2;
    
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, x, y, w, h);
  }

  // --- Scroll Engine ---
  const wrapper = document.querySelector('.seq-wrapper');
  const darkOverlay = document.querySelector('.seq-dark-overlay');
  
  // Text elements
  const introGroup = document.getElementById('seq-intro');
  const introDesc = document.getElementById('seq-intro-desc');
  const servicesGroup = document.getElementById('seq-services');
  const srvItems = document.querySelectorAll('.seq-srv-item');
  
  // Helpers
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const progressBetween = (prog, start, end) => clamp((prog - start) / (end - start), 0, 1);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  
  let ticking = false;
  
  function update() {
    ticking = false;
    const rect = wrapper.getBoundingClientRect();
    const maxScroll = wrapper.offsetHeight - window.innerHeight;
    const progress = clamp(-rect.top / maxScroll, 0, 1);
    
    // 1. Frame Sequence (0.00 -> 0.40)
    // Começa IMEDIATAMENTE (sem delay) para corrigir a sensação de demora no começo
    const seqProg = progressBetween(progress, 0.00, 0.40);
    const frameIndex = Math.min(frameCount - 1, Math.floor(seqProg * frameCount));
    renderFrame(frameIndex);
    
    // 2. Zoom into Screen (0.85 -> 1.0)
    const zoomProg = progressBetween(progress, 0.85, 1.0);
    const scaleVal = 1 + (easeOut(zoomProg) * 15);
    canvas.style.transform = `scale(${scaleVal})`;
    
    // Fade Out no canvas durante o zoom para esconder a perda de qualidade extrema do CSS scale
    canvas.style.opacity = 1 - progressBetween(progress, 0.85, 0.95);
    
    // 3. Dark Overlay (0.85 -> 0.95) - Sincronizado para cobrir os pixels esticados rápido
    darkOverlay.style.opacity = progressBetween(progress, 0.85, 0.95);
    
    // 4. Intro Texts
    // Fade OUT mais cedo, já que o notebook também começa a abrir mais cedo
    const introIn = progressBetween(progress, 0.00, 0.01);
    const introOut = progressBetween(progress, 0.02, 0.08);
    const introOpacity = introIn - introOut;
    
    introGroup.style.opacity = introOpacity;
    introGroup.style.pointerEvents = introOpacity > 0.1 ? 'auto' : 'none';
    
    // 5. Services Texts (Satellite Cards)
    // Fade IN assim que o notebook chega no ângulo final
    const srvIn = progressBetween(progress, 0.35, 0.45);
    const srvOut = progressBetween(progress, 0.80, 0.85);
    const srvOpacity = srvIn - srvOut;
    
    servicesGroup.style.pointerEvents = srvOpacity > 0.1 ? 'auto' : 'none';
    
    srvItems.forEach((item, idx) => {
      const stagger = idx * 0.04;
      const itemIn = progressBetween(progress, 0.35 + stagger, 0.45 + stagger);
      const itemOut = progressBetween(progress, 0.80, 0.85);
      
      const itemOpacity = itemIn - itemOut;
      item.style.opacity = itemOpacity;
      
      const yOffset = 20 - easeOut(itemIn) * 20;
      
      if (window.innerWidth <= 768) {
         item.style.transform = `translateX(-50%) translateY(${yOffset}px)`;
      } else {
         item.style.transform = `translateY(${yOffset}px)`;
      }
    });
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  
  // Initial draw
  resizeCanvas();
  update();
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

    if (type === 'landing_page') total += 497;
    else if (type === 'institucional') total += 997;
    else if (type === 'ecommerce') total += 1497;

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
  const WHATSAPP_NUMBER = '5500000000000';
  if (WHATSAPP_NUMBER === '5500000000000') {
    console.warn("⚠️ [QUERO MEU SITE] O número de WhatsApp configurado é um placeholder ('5500000000000'). Os CTAs não funcionarão corretamente. Substitua-o no arquivo main.js.");
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
