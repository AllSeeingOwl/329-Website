// Two-step breach flow for /system-override (the zine's back-cover QR target):
//   1. Reader enters the serial printed on Beatrix's card -> verified server-side via /api/verify,
//      which also sets the zine access cookie that unlocks the downloads.
//   2. Reader drops an email ("comms link") -> /api/emails/collect, then is routed to the data drop.

const SYSTEM_OVERRIDE_CONFIG = {
  DATA_DROP_URL: '/secure-data-drop-page',
  REDIRECT_DELAY_MS: 1800,
  EMAIL_SOURCE: 'zine_qr',
};

function formatSerial(raw) {
  const clean = String(raw || '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 12);
  return clean.match(/.{1,4}/g)?.join('-') || '';
}

async function verifySerial(code, fetchFn = fetch) {
  try {
    const res = await fetchFn('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ code }),
    });
    if (res.status === 429) return 'rate_limited';
    if (!res.ok) return 'error';
    const data = await res.json();
    return data && data.success ? 'ok' : 'denied';
  } catch {
    return 'error';
  }
}

async function submitCommsLink(email, fetchFn = fetch) {
  try {
    const res = await fetchFn('/api/emails/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: SYSTEM_OVERRIDE_CONFIG.EMAIL_SOURCE }),
    });
    // 403 = collection switched off by admin; let the reader through anyway.
    if (res.ok || res.status === 403) return 'ok';
    if (res.status === 400) return 'invalid';
    if (res.status === 429) return 'rate_limited';
    return 'error';
  } catch {
    return 'error';
  }
}

async function hasZineAccess(fetchFn = fetch) {
  try {
    const res = await fetchFn('/api/access-status', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.verified);
  } catch {
    return false;
  }
}

const SERIAL_MESSAGES = {
  denied: '[ ERROR ] INVALID SERIAL. ACCESS DENIED.',
  rate_limited: '[ LOCKOUT ] TOO MANY ATTEMPTS. MLTK IS WATCHING. TRY AGAIN LATER.',
  error: '[ ERROR ] CONNECTION FAILURE. MLTK ICE BLOCKING SIGNAL.',
};

const EMAIL_MESSAGES = {
  invalid: '[ ERROR ] THAT COMMS LINK IS MALFORMED. CHECK IT AND RETRY.',
  rate_limited: '[ LOCKOUT ] TOO MANY TRANSMISSIONS. TRY AGAIN LATER.',
  error: '[ ERROR ] TRANSMISSION FAILED. PLEASE TRY AGAIN.',
};

function showStep(doc, step) {
  const keyForm = doc.getElementById('keyForm');
  const emailStep = doc.getElementById('emailStep');
  if (keyForm) keyForm.style.display = step === 'key' ? '' : 'none';
  if (emailStep) emailStep.style.display = step === 'email' ? 'block' : 'none';
  const focusTarget = doc.getElementById(step === 'key' ? 'serialKey' : 'commsLink');
  if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
}

function setMessage(el, text) {
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

function initSystemOverride(
  doc = typeof document !== 'undefined' ? document : null,
  win = typeof window !== 'undefined' ? window : null,
  fetchFn = typeof fetch !== 'undefined' ? fetch : null
) {
  if (!doc || !fetchFn) return;

  const keyForm = doc.getElementById('keyForm');
  const serialInput = doc.getElementById('serialKey');
  const keyBtn = doc.getElementById('keyBtn');
  const emailForm = doc.getElementById('hackedForm');
  const emailInput = doc.getElementById('commsLink');
  const submitBtn = doc.getElementById('submitBtn');
  const successMessage = doc.getElementById('successMessage');
  const errorMessage = doc.getElementById('errorMessage');

  if (!keyForm || !emailForm) return;

  hasZineAccess(fetchFn).then((verified) => {
    if (verified) showStep(doc, 'email');
  });

  if (serialInput) {
    serialInput.addEventListener('input', () => {
      serialInput.value = formatSerial(serialInput.value);
    });
  }

  keyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = formatSerial(serialInput ? serialInput.value : '');
    if (!code) return;
    setMessage(errorMessage, '');
    if (keyBtn) {
      keyBtn.disabled = true;
      keyBtn.textContent = 'DECRYPTING...';
    }
    const result = await verifySerial(code, fetchFn);
    if (keyBtn) {
      keyBtn.disabled = false;
      keyBtn.textContent = 'DECRYPT';
    }
    if (result === 'ok') {
      showStep(doc, 'email');
    } else {
      setMessage(errorMessage, SERIAL_MESSAGES[result] || SERIAL_MESSAGES.error);
    }
  });

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) return;
    setMessage(errorMessage, '');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'TRANSMITTING...';
    }
    if (emailInput) emailInput.disabled = true;

    const result = await submitCommsLink(email, fetchFn);
    if (result === 'ok') {
      emailForm.style.display = 'none';
      if (successMessage) {
        successMessage.style.display = 'block';
        successMessage.tabIndex = -1;
        successMessage.focus();
      }
      if (win && win.setTimeout) {
        win.setTimeout(() => {
          win.location.assign(SYSTEM_OVERRIDE_CONFIG.DATA_DROP_URL);
        }, SYSTEM_OVERRIDE_CONFIG.REDIRECT_DELAY_MS);
      }
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'BREACH THE MAINFRAME';
      }
      if (emailInput) emailInput.disabled = false;
      setMessage(errorMessage, EMAIL_MESSAGES[result] || EMAIL_MESSAGES.error);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SYSTEM_OVERRIDE_CONFIG,
    formatSerial,
    verifySerial,
    submitCommsLink,
    hasZineAccess,
    initSystemOverride,
  };
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initSystemOverride());
}
