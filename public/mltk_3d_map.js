import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;

function init() {
  const container = document.getElementById('canvas-container');

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera setup
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(50, 40, 50);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going below ground
  controls.minDistance = 10;
  controls.maxDistance = 200;

  setupUI();
  setupKeyboard();

  // Create grid helper (classic neon green)

  const gridHelper = new THREE.GridHelper(100, 50, 0x00ff00, 0x002200);
  scene.add(gridHelper);

  // Building generation
  createCity();

  // Resize handler
  window.addEventListener('resize', onWindowResize);

  // Start animation loop
  animate();
}

function createCity() {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

  // Add some random buildings to create a fictional cityscape
  const buildingCount = 40;
  const gridSize = 100;
  const halfGrid = gridSize / 2;

  for (let i = 0; i < buildingCount; i++) {
    // Random dimensions
    const width = 2 + Math.random() * 6;
    const depth = 2 + Math.random() * 6;
    const height = 5 + Math.random() * 25;

    // Random positions snapped roughly to a grid
    const x = Math.floor(Math.random() * (gridSize / 5)) * 5 - halfGrid + 2.5;
    const z = Math.floor(Math.random() * (gridSize / 5)) * 5 - halfGrid + 2.5;

    // Create the geometry
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geometry);

    // Create the line segment (wireframe)
    const building = new THREE.LineSegments(edges, lineMaterial);

    // Position the building (y position is half height so it sits on the grid)
    building.position.set(x, height / 2, z);

    scene.add(building);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const activeActions = {
  panUp: false,
  panDown: false,
  panLeft: false,
  panRight: false,
  zoomIn: false,
  zoomOut: false,
  rotateLeft: false,
  rotateRight: false,
};

let inactivityTimer = null;
const INACTIVITY_DELAY = 3000; // 3 seconds

function setupKeyboard() {
  const keyMap = {
    ArrowUp: 'panUp',
    KeyW: 'panUp',
    ArrowDown: 'panDown',
    KeyS: 'panDown',
    ArrowLeft: 'panLeft',
    KeyA: 'panLeft',
    ArrowRight: 'panRight',
    KeyD: 'panRight',
    KeyQ: 'rotateLeft',
    KeyE: 'rotateRight',
    Equal: 'zoomIn',
    NumpadAdd: 'zoomIn',
    Minus: 'zoomOut',
    NumpadSubtract: 'zoomOut',
  };

  document.addEventListener('keydown', (e) => {
    const action = keyMap[e.code];
    if (action && !e.ctrlKey && !e.metaKey && !e.altKey) {
      activeActions[action] = true;
    }
  });

  document.addEventListener('keyup', (e) => {
    const action = keyMap[e.code];
    if (action) {
      activeActions[action] = false;
    }
  });
}

function setupUI() {
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const uiControls = document.getElementById('ui-controls');

  if (!isTouchDevice || !uiControls) return;

  uiControls.style.display = 'flex';

  const showUI = () => {
    uiControls.classList.add('active');
    uiControls.setAttribute('aria-hidden', 'false');
    resetInactivityTimer();
  };

  const hideUI = () => {
    uiControls.classList.remove('active');
    uiControls.setAttribute('aria-hidden', 'true');
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(hideUI, INACTIVITY_DELAY);
  };

  // Initially show UI
  showUI();

  // Show UI on interaction
  document.addEventListener('touchstart', showUI, { passive: true });
  document.addEventListener('touchmove', resetInactivityTimer, { passive: true });

  const buttons = [
    { id: 'btn-up', action: 'panUp' },
    { id: 'btn-down', action: 'panDown' },
    { id: 'btn-left', action: 'panLeft' },
    { id: 'btn-right', action: 'panRight' },
    { id: 'btn-rot-left', action: 'rotateLeft' },
    { id: 'btn-rot-right', action: 'rotateRight' },
    { id: 'btn-zoom-in', action: 'zoomIn' },
    { id: 'btn-zoom-out', action: 'zoomOut' },
  ];

  buttons.forEach(({ id, action }) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const startAction = (e) => {
      e.preventDefault(); // Prevent default touch actions like scrolling
      activeActions[action] = true;
      resetInactivityTimer();
    };

    const stopAction = (e) => {
      e.preventDefault();
      activeActions[action] = false;
      resetInactivityTimer();
    };

    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', stopAction);
    btn.addEventListener('mouseleave', stopAction);

    btn.addEventListener('touchstart', startAction, { passive: false });
    btn.addEventListener('touchend', stopAction, { passive: false });
    btn.addEventListener('touchcancel', stopAction, { passive: false });
  });
}

function updateCameraFromActions() {
  const panSpeed = 0.5;
  const zoomSpeed = 0.95;

  // We need to move the camera and target based on camera's current local axes
  const offset = new THREE.Vector3();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  // Flatten the vectors so panning is strictly horizontal/vertical relative to ground, not camera pitch
  right.y = 0;
  right.normalize();
  const forward = new THREE.Vector3().crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize();

  const rotateSpeed = 0.03;

  if (activeActions.rotateLeft) {
    const axis = new THREE.Vector3(0, 1, 0);
    camera.position.sub(controls.target);
    camera.position.applyAxisAngle(axis, rotateSpeed);
    camera.position.add(controls.target);
  }
  if (activeActions.rotateRight) {
    const axis = new THREE.Vector3(0, 1, 0);
    camera.position.sub(controls.target);
    camera.position.applyAxisAngle(axis, -rotateSpeed);
    camera.position.add(controls.target);
  }

  if (activeActions.panUp) {
    offset.add(forward.clone().multiplyScalar(-panSpeed));
  }
  if (activeActions.panDown) {
    offset.add(forward.clone().multiplyScalar(panSpeed));
  }
  if (activeActions.panLeft) {
    offset.add(right.clone().multiplyScalar(-panSpeed));
  }
  if (activeActions.panRight) {
    offset.add(right.clone().multiplyScalar(panSpeed));
  }

  if (offset.lengthSq() > 0) {
    camera.position.add(offset);
    controls.target.add(offset);
  }

  if (activeActions.zoomIn) {
    const dist = camera.position.distanceTo(controls.target);
    if (dist > controls.minDistance) {
      camera.position.lerp(controls.target, 1 - zoomSpeed);
    }
  }
  if (activeActions.zoomOut) {
    const dist = camera.position.distanceTo(controls.target);
    if (dist < controls.maxDistance) {
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      camera.position.add(dir.multiplyScalar(dist * (1 / zoomSpeed - 1)));
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateCameraFromActions();
  controls.update(); // required if controls.enableDamping or controls.autoRotate are set
  renderer.render(scene, camera);
}

// Initialize the 3D map once the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
