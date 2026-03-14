const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!<>{}[]';

function generateStatic(length) {
  if (length <= 0) return '';
  const randomValues = new Uint32Array(length);
  globalThis.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (val) => chars[val % chars.length]).join('');
}

function setupRadioScanner() {
  const slider = document.getElementById('freq-slider');
  const display = document.getElementById('freq-display');
  const output = document.getElementById('transmission-output');
  const radioBody = document.getElementById('radio-body');

  if (!slider || !display || !output || !radioBody) return;

  const decryptedMessage =
    "TRANSMISSION SECURED: What's up, groovy cats? Ollie here. If you're hearing this, you cracked the Dvorak disclaimer. The MLTK has eyes on the main routes. We are moving the operation. Meet us at the abandoned developer room under the Mini Rail. Bring bolt cutters. Stay wild.";

  slider.addEventListener('input', function () {
    let rawVal = parseInt(this.value);
    let freq = (rawVal / 10).toFixed(1);
    display.innerText = freq;

    if (freq === '104.9') {
      radioBody.classList.add('locked-in');
      output.classList.remove('anim-shake');

      output.textContent = '';
      let i = 0;
      let typingInterval = setInterval(() => {
        if (i < decryptedMessage.length) {
          output.textContent = decryptedMessage.substring(0, i + 1);
          i++;
        } else {
          clearInterval(typingInterval);
        }
      }, 30);
    } else {
      radioBody.classList.remove('locked-in');
      output.classList.add('anim-shake');

      let distance = Math.abs(1049 - rawVal);
      let staticLength = Math.max(20, distance);

      if (distance < 5) {
        output.innerText =
          '...TRANSMISSION S' +
          generateStatic(10) +
          'groovy c' +
          generateStatic(15) +
          'bolt cutters...';
      } else {
        output.innerText = generateStatic(staticLength);
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.setupRadioScanner = setupRadioScanner;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { chars, generateStatic, setupRadioScanner };
}
