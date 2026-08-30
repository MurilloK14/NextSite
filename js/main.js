document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaq();
  initCalculator();
  initWhatsAppButtons();
});

function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  // Simple mobile menu for demonstration. In a real app, this would toggle a nav overlay.
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
        document.body.style.overflow = 'hidden'; // prevent scrolling
      }
    };
    
    btn.addEventListener('click', toggleMenu);
    
    // Close when clicking a link
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
      
      // Close all others
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.setAttribute('aria-expanded', 'false');
          otherItem.nextElementSibling.style.maxHeight = null;
        }
      });
      
      // Toggle current
      item.setAttribute('aria-expanded', !isExpanded);
      if (!isExpanded) {
        answer.style.maxHeight = answer.scrollHeight + "px";
      } else {
        answer.style.maxHeight = null;
      }
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
    
    // Base prices based on project type
    let total = 0;
    const type = data.get('project_type');
    
    if (type === 'landing_page') total += 497;
    else if (type === 'institucional') total += 997;
    else if (type === 'ecommerce') total += 1497;
    
    // Addons
    const addons = data.getAll('addon');
    if (addons.includes('blog')) total += 200;
    if (addons.includes('multilingue')) total += 300;
    if (addons.includes('agendamento')) total += 250;
    
    resultValue.textContent = `R$ ${total}`;
    
    // Update button text to reflect choice
    const typeLabel = {
      'landing_page': 'Landing Page',
      'institucional': 'Site Institucional',
      'ecommerce': 'E-commerce'
    }[type] || 'Site';
    
    btnCalc.dataset.message = `OlÃ¡! Gostaria de solicitar um orÃ§amento para um(a) ${typeLabel}. A estimativa apresentada foi de R$ ${total}.`;
  };

  form.addEventListener('change', calculate);
  calculate(); // init
}

function initWhatsAppButtons() {
  // âš ï¸ OBRIGATÃ“RIO: Substitua pelo nÃºmero real de atendimento antes de publicar
  const WHATSAPP_NUMBER = '5500000000000';
  
  if (WHATSAPP_NUMBER === '5500000000000') {
    console.warn("âš ï¸ [NEXORA WEB] O nÃºmero de WhatsApp configurado Ã© um placeholder ('5500000000000'). Os CTAs nÃ£o funcionarÃ£o corretamente. Substitua-o no arquivo main.js.");
  }
  
  const buttons = document.querySelectorAll('.btn-whatsapp');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const customMessage = btn.dataset.message || "OlÃ¡! Gostaria de conversar sobre a criaÃ§Ã£o de um site para o meu negÃ³cio.";
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(customMessage)}`;
      
      window.open(url, '_blank');
    });
  });
}


document.getElementById('footer-year').textContent = new Date().getFullYear();

