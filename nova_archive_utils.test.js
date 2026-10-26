/**
 * @jest-environment jsdom
 */

const { documents, openDoc, closeDoc } = require('./public/nova_archive_utils');

describe('NOVA Classified Archive Modal', () => {
  beforeEach(() => {
    // Set up the DOM
    document.body.innerHTML = `
            <button id="trigger-btn">Open Doc</button>
            <div id="doc-viewer" role="dialog" aria-modal="true" aria-labelledby="modal-header">
                <button class="close-btn">[X] CLOSE</button>
                <div id="modal-header"></div>
                <div id="modal-body"></div>
            </div>
        `;
  });

  describe('openDoc', () => {
    test('opens an existing document and populates content correctly', () => {
      const viewer = document.getElementById('doc-viewer');
      const header = document.getElementById('modal-header');
      const body = document.getElementById('modal-body');

      expect(viewer.classList.contains('visible')).toBe(false);
      expect(header.innerText).toBe(undefined);
      expect(body.innerHTML).toBe('');

      openDoc('vv');

      expect(viewer.classList.contains('visible')).toBe(true);
      expect(header.textContent).toBe(documents['vv'].title);
      expect(body.innerHTML).toBe(documents['vv'].content);
    });

    test('handles invalid document IDs gracefully', () => {
      const viewer = document.getElementById('doc-viewer');
      const header = document.getElementById('modal-header');
      const body = document.getElementById('modal-body');

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      openDoc('invalid-doc-id');

      expect(viewer.classList.contains('visible')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Document not found:', 'invalid-doc-id');
      expect(header.innerText).toBe(undefined);
      expect(body.innerHTML).toBe('');

      consoleSpy.mockRestore();
    });

    test('handles missing DOM elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => openDoc('vv')).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Required DOM elements for document viewer are missing.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('closeDoc', () => {
    test('closes the document viewer', () => {
      const viewer = document.getElementById('doc-viewer');

      // Open first
      openDoc('gretchen');
      expect(viewer.classList.contains('visible')).toBe(true);

      // Then close
      closeDoc();
      expect(viewer.classList.contains('visible')).toBe(false);
    });

    test('handles missing viewer element gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements

      // Should not throw an error
      expect(() => closeDoc()).not.toThrow();
    });
  });

  describe('Accessibility & Focus Management', () => {
    test('sets ARIA attributes on modal element', () => {
      const viewer = document.getElementById('doc-viewer');
      openDoc('vv');
      expect(viewer.getAttribute('role')).toBe('dialog');
      expect(viewer.getAttribute('aria-modal')).toBe('true');
      expect(viewer.getAttribute('aria-labelledby')).toBe('modal-header');
    });

    test('shifts focus to close button on open and restores focus to trigger element on close', () => {
      const trigger = document.getElementById('trigger-btn');
      const closeBtn = document.querySelector('.close-btn');

      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      openDoc('vv');
      expect(document.activeElement).toBe(closeBtn);

      closeDoc();
      expect(document.activeElement).toBe(trigger);
    });

    test('closes modal when Escape key is pressed', () => {
      const viewer = document.getElementById('doc-viewer');
      openDoc('vv');
      expect(viewer.classList.contains('visible')).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(viewer.classList.contains('visible')).toBe(false);
    });
  });

  describe('Quiz Result Modals Accessibility', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form id="immigration-quiz">
          <input type="radio" name="q1" value="A" />
          <input type="radio" name="q2" value="A" />
          <button type="button" class="submit-btn">Submit Answers</button>
        </form>
        <div id="error-modal" class="result-modal" role="dialog" aria-modal="true" aria-labelledby="error-modal-header">
          <h2 id="error-modal-header">SYSTEM ERROR: ANOMALY DETECTED</h2>
          <button class="close-btn" aria-label="Close error modal">[X] CLOSE</button>
        </div>
        <div id="success-modal" class="result-modal" role="dialog" aria-modal="true" aria-labelledby="success-modal-header">
          <h2 id="success-modal-header">ASSIMILATION APPROVED</h2>
          <button class="close-btn" aria-label="Close success modal">[X] CLOSE</button>
        </div>
      `;
    });

    test('error-modal and success-modal have required dialog ARIA attributes', () => {
      const errorModal = document.getElementById('error-modal');
      const successModal = document.getElementById('success-modal');

      expect(errorModal.getAttribute('role')).toBe('dialog');
      expect(errorModal.getAttribute('aria-modal')).toBe('true');
      expect(errorModal.getAttribute('aria-labelledby')).toBe('error-modal-header');

      expect(successModal.getAttribute('role')).toBe('dialog');
      expect(successModal.getAttribute('aria-modal')).toBe('true');
      expect(successModal.getAttribute('aria-labelledby')).toBe('success-modal-header');
    });
  });
});
