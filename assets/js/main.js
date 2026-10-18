/* ПВХ-Мастер: контакты, слайдеры «было/стало», этапы, вкладки */

// ===== Контакты: меняйте только здесь =====
const CONTACTS = {
  phone: '+7 (000) 000-00-00',      // номер для звонков и WhatsApp
  telegram: 'https://t.me/username', // ссылка на Telegram (позже — на бота)
  vk: 'https://vk.com/username',     // ссылка на ВКонтакте (позже — на бота)
};
const DEFAULT_MSG = 'Здравствуйте! Хочу узнать стоимость работ.';
// ==========================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- Ссылки на мессенджеры и телефон ---------- */
let digits = CONTACTS.phone.replace(/\D/g, '');
if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);

const waLink = (msg) => `https://wa.me/${digits}?text=${encodeURIComponent(msg || DEFAULT_MSG)}`;

function applyContacts(root = document) {
  root.querySelectorAll('[data-contact]').forEach((a) => {
    const kind = a.dataset.contact;
    if (kind === 'tel') a.href = `tel:+${digits}`;
    if (kind === 'wa') a.href = waLink(a.dataset.msg);
    if (kind === 'tg') a.href = CONTACTS.telegram;
    if (kind === 'vk') a.href = CONTACTS.vk;
  });
  root.querySelectorAll('[data-phone-label]').forEach((el) => { el.textContent = CONTACTS.phone; });
}
applyContacts();

/* ---------- Окно «Написать нам» ---------- */
const sheet = document.getElementById('contact-sheet');
if (sheet && typeof sheet.showModal === 'function') {
  const sheetWa = sheet.querySelector('[data-sheet-msg]');

  document.querySelectorAll('[data-open-contact]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sheetWa.href = waLink(btn.dataset.msg);
      sheet.showModal();
    });
  });
  sheet.querySelector('[data-close-contact]').addEventListener('click', () => sheet.close());
  // клик по затемнению вокруг окна
  sheet.addEventListener('click', (e) => {
    const r = sheet.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) sheet.close();
  });
  // после выбора канала окно больше не нужно
  sheet.querySelectorAll('.channel').forEach((a) => a.addEventListener('click', () => setTimeout(() => sheet.close(), 150)));
} else {
  // очень старые браузеры: просто ведём к блоку контактов
  document.querySelectorAll('[data-open-contact]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById('contacts').scrollIntoView());
  });
}

/* ---------- Было / стало ---------- */
function initCompare(el) {
  const handle = el.querySelector('.compare-handle');
  let pos = 50;
  let dragging = false;
  let touchStart = null;
  let hint = null;

  const set = (p) => {
    pos = clamp(p, 0, 100);
    el.style.setProperty('--pos', `${pos}%`);
    handle.setAttribute('aria-valuenow', Math.round(pos));
    handle.setAttribute('aria-valuetext', `Было ${Math.round(pos)}%, стало ${100 - Math.round(pos)}%`);
    el.dataset.edge = pos < 14 ? 'left' : pos > 86 ? 'right' : '';
  };
  const fromEvent = (e) => {
    const r = el.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };
  const stopHint = () => { if (hint) { cancelAnimationFrame(hint); hint = null; } };
  const startDrag = (e) => {
    dragging = true;
    stopHint();
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    set(fromEvent(e));
  };
  const endDrag = () => {
    dragging = false;
    touchStart = null;
    el.classList.remove('is-dragging');
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // на сенсоре ждём горизонтального движения, чтобы не мешать прокрутке страницы
    if (e.pointerType === 'touch') touchStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    else startDrag(e);
  });
  el.addEventListener('pointermove', (e) => {
    if (dragging) { set(fromEvent(e)); return; }
    if (touchStart && e.pointerId === touchStart.id) {
      const dx = Math.abs(e.clientX - touchStart.x);
      const dy = Math.abs(e.clientY - touchStart.y);
      if (dx > 6 && dx > dy) startDrag(e);
    }
  });
  el.addEventListener('pointerup', (e) => {
    // короткий тап без движения тоже переставляет ручку
    if (!dragging && touchStart && e.pointerId === touchStart.id) set(fromEvent(e));
    endDrag();
  });
  el.addEventListener('pointercancel', endDrag);

  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 4;
    const map = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100 };
    if (e.key in map) {
      e.preventDefault();
      stopHint();
      set(map[e.key]);
    }
  });

  set(50);

  // одна подсказка при первом показе: ручка качнётся влево-вправо
  if (el.hasAttribute('data-hint') && !reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      setTimeout(() => {
        if (dragging) return;
        const t0 = performance.now();
        const dur = 1700;
        const tick = (now) => {
          const t = clamp((now - t0) / dur, 0, 1);
          // 50 → 28 → 72 → 50, плавно затухая
          set(50 + Math.sin(t * Math.PI * 2) * -22 * (1 - t * 0.35));
          hint = t < 1 ? requestAnimationFrame(tick) : null;
          if (t === 1) set(50);
        };
        hint = requestAnimationFrame(tick);
      }, 700);
    }, { threshold: 0.6 });
    io.observe(el);
  }
}
document.querySelectorAll('[data-compare]').forEach(initCompare);

/* ---------- Этапы балкона ---------- */
document.querySelectorAll('[data-story]').forEach((story) => {
  const track = story.querySelector('[data-story-track]');
  const slides = Array.from(track.children);
  const steps = Array.from(story.querySelectorAll('[data-story-go]'));
  const stepList = story.querySelector('.story-steps');
  const prev = story.querySelector('[data-story-prev]');
  const next = story.querySelector('[data-story-next]');
  let current = 0;

  const go = (i) => {
    i = clamp(i, 0, slides.length - 1);
    track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const mark = (i) => {
    if (i === current && steps[i].hasAttribute('aria-current')) return;
    current = i;
    steps.forEach((s, j) => (j === i ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current')));
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
    // держим активный этап в зоне видимости ленты, не трогая прокрутку страницы
    const btn = steps[i];
    const left = btn.offsetLeft - (stepList.clientWidth - btn.offsetWidth) / 2;
    stepList.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  let raf = null;
  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      mark(clamp(Math.round(track.scrollLeft / track.clientWidth), 0, slides.length - 1));
    });
  }, { passive: true });

  steps.forEach((s, i) => s.addEventListener('click', () => go(i)));
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
  });
  window.addEventListener('resize', () => track.scrollTo({ left: current * track.clientWidth }));

  mark(0);
});

/* ---------- Тёплое / холодное остекление ---------- */
document.querySelectorAll('.segmented').forEach((seg) => {
  const tabs = Array.from(seg.querySelectorAll('[role="tab"]'));
  const select = (i, focus) => {
    tabs.forEach((t, j) => {
      const on = j === i;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    seg.dataset.active = i;
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
      }
    });
  });
});

/* ---------- Нижняя панель прячется у блока контактов ---------- */
const dock = document.querySelector('.dock');
const contacts = document.getElementById('contacts');
if (dock && contacts && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    dock.classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0.25 }).observe(contacts);
}
