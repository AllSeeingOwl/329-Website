async function checkPhaseModuleGate(pageFilename) {
  try {
    const isLocalBypassed = localStorage.getItem('mltk_bypass_' + pageFilename) === 'true';
    if (isLocalBypassed) return;

    const res = await fetch('/api/phases');
    if (!res.ok) return;

    const data = await res.json();
    const activePhase = data.phases.find((p) => p.id === data.activePhaseId);
    if (!activePhase) return;

    if (activePhase.heldBackModules.includes(pageFilename)) {
      renderHeldBackGate(pageFilename, activePhase.name);
    }
  } catch {
    // Silent catch on network error to allow fallback
  }
}

function renderHeldBackGate(pageFilename, phaseName) {
  const gateDiv = document.createElement('div');
  gateDiv.id = 'held-back-gate-overlay';
  gateDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    color: #ff3366;
    z-index: 999999;
    font-family: 'VT323', monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;
  `;

  gateDiv.innerHTML = `
    <div style="border: 2px solid #ff3366; max-width: 600px; width: 100%; padding: 30px; background: rgba(20, 0, 10, 0.95); text-align: center; box-shadow: 0 0 20px #ff3366;">
      <h1 style="font-size: 2.2rem; margin-top: 0; text-transform: uppercase;">[ ACCESS DENIED: HELD BACK MODULE ]</h1>
      <p style="font-size: 1.3rem; color: #ffcc00; margin: 15px 0;">This module is held back in ${phaseName}.</p>
      <p style="font-size: 1.1rem; color: #aaa;">Enter authorization key or admin bypass code to proceed:</p>
      <div style="margin-top: 20px;">
        <input type="password" id="gate-bypass-input" placeholder="BYPASS CODE" style="background: #000; color: #00ff00; border: 1px solid #00ff00; padding: 8px 12px; font-family: 'VT323', monospace; font-size: 1.2rem; width: 220px;" />
        <button id="gate-bypass-btn" style="background: #00ff00; color: #000; border: none; padding: 8px 16px; font-family: 'VT323', monospace; font-size: 1.2rem; cursor: pointer; margin-left: 6px;">BYPASS</button>
      </div>
      <div id="gate-error-msg" style="color: #ff3366; margin-top: 10px; display: none; font-weight: bold;">INVALID BYPASS CODE</div>
      <div style="margin-top: 25px;">
        <a href="mltk-surveillance-dashboard.html" style="color: #00ff00; text-decoration: underline; font-size: 1.2rem;">&lt;&lt; RETURN TO SURVEILLANCE DASHBOARD</a>
      </div>
    </div>
  `;

  document.body.appendChild(gateDiv);

  const input = document.getElementById('gate-bypass-input');
  const btn = document.getElementById('gate-bypass-btn');
  const errorMsg = document.getElementById('gate-error-msg');

  const attemptBypass = () => {
    const val = input.value.trim();
    if (val === '0408-1998-XXXX' || val === 'OVERRIDE' || val === 'admin') {
      localStorage.setItem('mltk_bypass_' + pageFilename, 'true');
      gateDiv.remove();
    } else {
      errorMsg.style.display = 'block';
    }
  };

  btn.addEventListener('click', attemptBypass);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptBypass();
  });
}

if (typeof window !== 'undefined') {
  window.checkPhaseModuleGate = checkPhaseModuleGate;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkPhaseModuleGate, renderHeldBackGate };
}
