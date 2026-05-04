const CONFIG = {};

let domCache = null;

function getDomCache() {
  if (!domCache && typeof document !== 'undefined') {
    domCache = {
      inputField: document.getElementById('serial-input'),
      errorMsg: document.getElementById('error-msg'),
      inputGroup: document.getElementById('input-group'),
      lockdownScreen: document.getElementById('lockdown-screen'),
      successScreen: document.getElementById('success-screen'),
    };
  }
  return domCache;
}

// Ensure tests can reset domCache
if (typeof module !== 'undefined' && module.exports) {
  module.exports._resetDomCache = function () {
    domCache = null;
  };
}
const lockdownClickHandler = () => {
  const cache = getDomCache();
  const lockdownScreen = cache?.lockdownScreen;
  const inputField = cache?.inputField;
  if (lockdownScreen && lockdownScreen.style.display !== 'none' && inputField) {
    inputField.focus();
  }
};

function setupEventListeners() {
  const cache = getDomCache();
  const inputField = cache?.inputField;
  if (inputField) {
    // Set initial width
    inputField.style.width = inputField.value ? inputField.value.length + 'ch' : '0ch';

    inputField.addEventListener('input', function (e) {
      let target = e.target;
      let val = target.value.replace(/-/g, '').toUpperCase();
      target.value = val.match(/.{1,4}/g)?.join('-') || '';

      // Adjust width dynamically so the cursor sticks to the text
      target.style.width = target.value.length + 'ch';

      // If we want to auto-submit on 14 characters we should NOT pass the input event to verifyCode
      // Instead, we just let them press enter, or if we want to auto-submit we need to verify we aren't doing it when backspacing
      if (target.value.length === 14 && e.inputType !== 'deleteContentBackward') {
        verifyCode();
      }
    });
  }

  document.removeEventListener('click', lockdownClickHandler);
  document.addEventListener('click', lockdownClickHandler);
}

async function performApiFetch(code) {
  const response = await fetch('/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code }),
  });

  if (!response.ok) {
    throw new Error('API returned an error or is not available');
  }

  return response.json();
}

async function attemptApiVerification(code) {
  try {
    const result = await performApiFetch(code);
    return result.success;
  } catch (apiError) {
    console.error('Error verifying code via API:', apiError);
    return false;
  }
}

async function verifyCode(e) {
  e?.preventDefault();
  const cache = getDomCache();
  const inputField = cache?.inputField;
  const code = inputField?.value?.trim().toUpperCase() ?? '';
  const errorMsg = cache?.errorMsg;
  const inputGroup = cache?.inputGroup;

  try {
    const success = await attemptApiVerification(code).catch((apiError) => {
      console.error('Error in verification:', apiError);
      return false;
    });

    if (!success) {
      if (errorMsg) errorMsg.style.display = 'block';
      if (inputGroup) {
        inputGroup.classList.remove('shake');
        void inputGroup.offsetWidth; // trigger reflow
        inputGroup.classList.add('shake');
      }
      if (inputField) inputField.value = '';
      setTimeout(() => {
        if (errorMsg) errorMsg.style.display = 'none';
      }, 3000);
      return;
    }

    if (document.body) {
      document.body.style.backgroundColor = '#050505';
    }
    const lockdownScreen = cache?.lockdownScreen;
    if (lockdownScreen) lockdownScreen.style.display = 'none';
    const successScreen = cache?.successScreen;
    if (successScreen) successScreen.style.display = 'flex';

    // Briefly display success screen then redirect to surveillance dashboard
    setTimeout(() => {
      window.location.href = 'mltk-surveillance-dashboard.html';
    }, 2000);
  } catch (error) {
    console.error('Error verifying code:', error);
  }
}

// Ensure events are attached on load when in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
}

// Make functions available globally so HTML can call verifyCode
if (typeof window !== 'undefined') {
  window.verifyCode = verifyCode;
  window.setupEventListeners = setupEventListeners;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupEventListeners,
    verifyCode,
    attemptApiVerification,
    performApiFetch,
    CONFIG,
    clearDomCache: () => {
      domCache = null;
    },
  };
}
