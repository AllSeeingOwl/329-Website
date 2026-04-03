// Vercel Speed Insights Integration
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSpeedInsights);
} else {
  initSpeedInsights();
}

function initSpeedInsights() {
  injectSpeedInsights({
    debug: false, // Set to true to see events in console during development
  });
}
