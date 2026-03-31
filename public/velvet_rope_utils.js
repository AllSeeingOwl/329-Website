const CONFIG = {
  SHOULD_REDIRECT: false,
  REDIRECT_TARGET: 'secure-drop.html',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initVelvetRope() {
  await sleep(2000);

  const facade = document.getElementById('facade');
  const underground = document.getElementById('underground');

  if (!facade || !underground) return;

  facade.classList.add('screen-tear');

  await sleep(400);

  facade.style.display = 'none';
  underground.style.display = 'block';
  document.body.style.backgroundColor = '#050505';
  document.title = 'SYSTEM OVERRIDE // TEAM RABBIT';

  const beaBox = document.getElementById('beatrix-intrusion');
  const triggerPoint = document.getElementById('bea-trigger-point');
  let hasTriggered = false;

  if (!beaBox || !triggerPoint) return;

  // ⚡ Bolt: Replaced continuous scroll event listener and bounding rect calculations
  // with an IntersectionObserver. This offloads the visibility check from the main thread
  // and eliminates scroll jank by firing only when the element actually crosses the threshold.
  const observer = new IntersectionObserver(
    async (entries, obs) => {
      const entry = entries[0];
      if (entry.isIntersecting && !hasTriggered) {
        hasTriggered = true;
        obs.disconnect();

        beaBox.style.display = 'block';

        await sleep(50);
        beaBox.classList.add('visible');

        await sleep(8000);
        beaBox.classList.add('crushed');
        const merrickStamp = document.getElementById('merrick-stamp');
        if (merrickStamp) merrickStamp.style.display = 'block';
      }
    },
    {
      root: null,
      rootMargin: '-50% 0px 0px 0px', // Triggers when the element reaches the vertical center
      threshold: 0,
    }
  );

  observer.observe(triggerPoint);
}

async function breachMainframe(e, win = typeof window !== 'undefined' ? window : null) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  if (e && e.target && typeof e.target.setAttribute === 'function') {
    e.target.setAttribute('aria-busy', 'true');
  }
  const btn = e && e.target && typeof e.target.querySelector === 'function' ? e.target.querySelector('button') : null;
  if (btn) {
    // ⚡ Bolt: Replace innerText with textContent to avoid synchronous layout reflows when updating text
    btn.textContent = 'LINK ESTABLISHED...';
    btn.style.backgroundColor = '#fff';
    btn.style.color = '#ff003c';
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
  }

  await sleep(800);

  if (CONFIG.SHOULD_REDIRECT) {
    if (win && win.location) {
      try {
        win.location.assign(CONFIG.REDIRECT_TARGET);
      } catch (err) {
        win.location.href = CONFIG.REDIRECT_TARGET;
      }
    }
    return;
  }

  const customBox = document.createElement('div');
  customBox.style.cssText =
    "position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#000; border:2px solid #ff003c; color:#00ff00; padding:20px; z-index:9999; font-family:'VT323', monospace; font-size:1.5rem; max-width: 400px; text-align:center;";

  const p = document.createElement('p');
  p.textContent = 'COMMUNICATION SECURED.';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'CLOSE';
  closeBtn.style.cssText =
    'background:#ff003c; color:#000; border:none; padding:5px 10px; font-family:Anton, sans-serif; cursor:pointer; margin-top:10px;';
  closeBtn.onclick = function () {
    if (this.parentElement) {
      this.parentElement.remove();
    }
    if (e && e.target && typeof e.target.removeAttribute === 'function') {
      e.target.removeAttribute('aria-busy');
    }
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
      btn.textContent = 'BREACH THE MAINFRAME';
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }
  };

  customBox.appendChild(p);
  customBox.appendChild(closeBtn);
  document.body.appendChild(customBox);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVelvetRope);
  } else {
    initVelvetRope();
  }
}

if (typeof window !== 'undefined') {
  window.breachMainframe = breachMainframe;
  window.initVelvetRope = initVelvetRope;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initVelvetRope, breachMainframe, CONFIG };
}
// 🧹 code health improvement: async/await refactoring has already been merged here.
