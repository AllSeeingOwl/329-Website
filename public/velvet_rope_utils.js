const CONFIG = {
  SHOULD_REDIRECT: false,
  REDIRECT_TARGET: 'secure-drop.html',
};

function initVelvetRope() {
  setTimeout(() => {
    const facade = document.getElementById('facade');
    const underground = document.getElementById('underground');

    if (!facade || !underground) return;

    facade.classList.add('screen-tear');

    setTimeout(() => {
      facade.style.display = 'none';
      underground.style.display = 'block';
      document.body.style.backgroundColor = '#050505';
      document.title = 'SYSTEM OVERRIDE // TEAM RABBIT';

      const beaBox = document.getElementById('beatrix-intrusion');
      const triggerPoint = document.getElementById('bea-trigger-point');
      let hasTriggered = false;

      if (!beaBox || !triggerPoint) return;

      let ticking = false;
      const scrollHandler = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const triggerPosition = triggerPoint.getBoundingClientRect().top;
            const screenHalfway = window.innerHeight * 0.5;

            if (triggerPosition < screenHalfway && !hasTriggered) {
              hasTriggered = true;
              window.removeEventListener('scroll', scrollHandler);

              beaBox.style.display = 'block';

              setTimeout(() => beaBox.classList.add('visible'), 50);

              setTimeout(() => {
                beaBox.classList.add('crushed');
                const merrickStamp = document.getElementById('merrick-stamp');
                if (merrickStamp) merrickStamp.style.display = 'block';
              }, 8000);
            }
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', scrollHandler);
    }, 400);
  }, 2000);
}

function breachMainframe(e, win = typeof window !== 'undefined' ? window : null) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const btn = e && e.target ? e.target.querySelector('button') : null;
  if (btn) {
    btn.innerText = 'LINK ESTABLISHED...';
    btn.style.backgroundColor = '#fff';
    btn.style.color = '#ff003c';
  }

  setTimeout(() => {
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
    };

    customBox.appendChild(p);
    customBox.appendChild(closeBtn);
    document.body.appendChild(customBox);
  }, 800);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initVelvetRope);
}

if (typeof window !== 'undefined') {
  window.breachMainframe = breachMainframe;
  window.initVelvetRope = initVelvetRope;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initVelvetRope, breachMainframe, CONFIG };
}
