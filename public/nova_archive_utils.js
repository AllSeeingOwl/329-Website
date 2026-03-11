// -----------------------------------------
// Document Content Database
// -----------------------------------------
const documents = {
    'vv': {
        title: "VIRTUE VILLAGES: ARCHITECTURAL OVERVIEW",
        content: `<p><strong>CONFIDENTIAL: FOR MLTK DIRECTORS ONLY</strong></p>
                  <p>The 26 Virtue Villages have been successfully constructed under the 'Monopoly Board' grid mandate. As per Director Meredith's specifications, natural growth is strictly prohibited. All pathways, housing blocks, and public gardens have been rigidly formatted.</p>
                  <p><strong>SECURITY NOTE:</strong> The public gardens are the only designated 'sanctuaries from corruption.' Maintenance of these spaces is paramount to keeping the populace docile.</p>
                  <p>To prevent unauthorized navigation by dissident groups (e.g., 'Team Rabbit'), the structural layouts of all villages—from Altruistically to Zealously—must adhere strictly to the Tetromino configurations.</p>`
    },
    'gretchen': {
        title: "PERSONNEL FILE: MEREDITH, GRETCHEN",
        content: `<p><strong>ROLE:</strong> Director of Operations, City of Everywhere.</p>
                  <p><strong>STATUS:</strong> Active.</p>
                  <p><strong>PSYCHOLOGICAL EVALUATION:</strong> Subject exhibits extreme control-oriented behaviors. Prioritizes systemic perfection over human collateral. The subject's "Refined Lexicon" masks a deep-seated ruthlessness.</p>
                  <p><strong>NOTE FROM PROF. YARARA:</strong> Gretchen possesses the 'killer instinct' necessary to eliminate the variables that oppose us. We will utilize her ambition. Upon successful acquisition of control, she shall be instated as Mayor.</p>`
    },
    'tetromino': {
        title: "LOG: TETROMINO RESTRICTION PROTOCOL",
        content: `<p>To ensure total spatial control, all buildings within the City of Everywhere must conform to one of the seven approved geometric block shapes (I, O, T, L, J, S, and Z).</p>
                  <p>Any structure found deviating from the Tetromino grid will be marked as a 'Structural Anomaly' and immediately designated for demolition.</p>
                  <p><em>[HANDWRITTEN MARGINALIA DIGITIZED]</em>: If those punk kids in the Town of There keep building their junk-shacks out of code, send the bulldozers in. - G.M.</p>`
    }
};

// -----------------------------------------
// Modal Logic
// -----------------------------------------
function openDoc(docId) {
    const viewer = document.getElementById('doc-viewer');
    const header = document.getElementById('modal-header');
    const body = document.getElementById('modal-body');

    if (!documents[docId]) {
        console.error("Document not found:", docId);
        return;
    }

    header.innerText = documents[docId].title;
    body.innerHTML = documents[docId].content;

    viewer.classList.add('visible');
}

function closeDoc() {
    const viewer = document.getElementById('doc-viewer');
    if (viewer) {
        viewer.classList.remove('visible');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { documents, openDoc, closeDoc };
}
