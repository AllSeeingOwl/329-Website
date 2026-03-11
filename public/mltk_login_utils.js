function setupEventListeners() {
    const inputField = document.getElementById('serial-input');
    if (inputField) {
        inputField.addEventListener('input', function (e) {
            let target = e.target;
            let val = target.value.replace(/-/g, '').toUpperCase();
            target.value = val.match(/.{1,4}/g)?.join('-') || '';
        });
    }

    document.addEventListener('click', () => {
        const lockdownScreen = document.getElementById('lockdown-screen');
        if (lockdownScreen && lockdownScreen.style.display !== 'none' && inputField) {
            inputField.focus();
        }
    });
}

async function verifyCode(e) {
    if (e) e.preventDefault();
    const inputField = document.getElementById('serial-input');
    const code = inputField ? inputField.value.trim().toUpperCase() : '';
    const errorMsg = document.getElementById('error-msg');
    const inputGroup = document.getElementById('input-group');

    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code }),
        });

        const result = await response.json();

        if (result.success) {
            document.body.style.backgroundColor = "#050505";
            const lockdownScreen = document.getElementById('lockdown-screen');
            if (lockdownScreen) lockdownScreen.style.display = "none";
            const successScreen = document.getElementById('success-screen');
            if (successScreen) successScreen.style.display = "flex";
        } else {
            if (errorMsg) errorMsg.style.display = "block";
            if (inputGroup) {
                inputGroup.classList.remove('shake');
                void inputGroup.offsetWidth; // trigger reflow
                inputGroup.classList.add('shake');
            }
            if (inputField) inputField.value = "";
            setTimeout(() => {
                if (errorMsg) errorMsg.style.display = "none";
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
    module.exports = { setupEventListeners, verifyCode };
}