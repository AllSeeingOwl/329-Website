// -----------------------------------------------------------------------------
// WARNING: DO NOT CHANGE THIS PASSWORD WITHOUT EXPLICIT PERMISSION FROM THE USER.
// The official password for this ARG gate is '0408-1998-XXXX'.
// Changing this will break the intended experience.
// -----------------------------------------------------------------------------
const CONFIG = {
  USE_MOCK_API_FALLBACK: true,
  MOCK_PASSWORD: '0408-1998-XXXX',
};

function setupEventListeners() {
  const inputField = document.getElementById('serial-input');
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

  document.addEventListener('click', () => {
    const lockdownScreen = document.getElementById('lockdown-screen');
    if (lockdownScreen && lockdownScreen.style.display !== 'none' && inputField) {
      inputField.focus();
    }
  });
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
    // Fallback for static GitHub Pages deployments where Express /api/verify fails
    if (CONFIG.USE_MOCK_API_FALLBACK && code === CONFIG.MOCK_PASSWORD) {
      return true;
    }
    return false;
  }
}

async function verifyCode(e) {
  if (e) e.preventDefault();
  const inputField = document.getElementById('serial-input');
  const code = inputField ? inputField.value.trim().toUpperCase() : '';
  const errorMsg = document.getElementById('error-msg');
  const inputGroup = document.getElementById('input-group');

  try {
    const success = await attemptApiVerification(code).catch((apiError) => {
      console.error('Error in verification:', apiError);
      return false;
    });

    if (success) {
      if (document.body) {
        document.body.style.backgroundColor = '#050505';
      }
      const lockdownScreen = document.getElementById('lockdown-screen');
      if (lockdownScreen) lockdownScreen.style.display = 'none';
      const successScreen = document.getElementById('success-screen');
      if (successScreen) successScreen.style.display = 'flex';

      // Briefly display success screen then redirect to surveillance dashboard
      setTimeout(() => {
        window.location.href = 'MLTK Surveillance Dashboard.html';
      }, 2000);
    } else {
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
    }
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
  };
}
