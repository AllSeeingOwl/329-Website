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

function animate() {
  requestAnimationFrame(animate);
  controls.update(); // required if controls.enableDamping or controls.autoRotate are set
  renderer.render(scene, camera);
}

// Initialize the 3D map once the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
