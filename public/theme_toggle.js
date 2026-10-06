document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'theme-toggle';
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.bottom = '20px';
  toggleBtn.style.right = '20px';
  toggleBtn.style.zIndex = '9999';
  toggleBtn.style.padding = '10px';
  toggleBtn.style.background = 'var(--text-color)';
  toggleBtn.style.color = 'var(--bg-color)';
  toggleBtn.style.border = 'none';
  toggleBtn.style.borderRadius = '50%';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.width = '44px';
  toggleBtn.style.height = '44px';
  toggleBtn.style.display = 'flex';
  toggleBtn.style.alignItems = 'center';
  toggleBtn.style.justifyContent = 'center';
  toggleBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

  // SVG icons
  const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

  const updateToggleState = (isDark) => {
    toggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);
    toggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  };

  const savedTheme = localStorage.getItem('studio-theme') || 'light';
  const isInitialDark = savedTheme === 'dark';
  if (isInitialDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateToggleState(isInitialDark);

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('studio-theme', 'light');
      updateToggleState(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('studio-theme', 'dark');
      updateToggleState(true);
    }
  });

  document.body.appendChild(toggleBtn);
});
