/**
 * @jest-environment jsdom
 */

const { documents, openDoc, closeDoc } = require('./public/nova_archive_utils');

describe('NOVA Classified Archive Modal', () => {
    beforeEach(() => {
        // Set up the DOM
        document.body.innerHTML = `
            <div id="doc-viewer">
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
            expect(header.innerText).toBe(documents['vv'].title);
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
            expect(consoleSpy).toHaveBeenCalledWith("Document not found:", 'invalid-doc-id');
            expect(header.innerText).toBe(undefined);
            expect(body.innerHTML).toBe('');

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
});
