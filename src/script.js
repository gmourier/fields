import * as THREE from 'three'
import * as dat from 'lil-gui'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

THREE.Cache.enabled = true;

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Screen Management
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Base camera
const camera = new THREE.OrthographicCamera(0, sizes.width, 0, sizes.height, 1, 1000);
camera.position.z = 1
camera.zoom = 0.85;

var planeGeometry = new THREE.PlaneGeometry(sizes.width, sizes.height);
var planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
});

var plane = new THREE.Mesh(planeGeometry, planeMaterial);

// move plane
plane.position.x = sizes.width/2;
plane.position.y = sizes.height/2;
plane.position.z = -0.1;

plane.renderOrder = -1;

const camGroup = new THREE.Group();
camGroup.add(camera);
camGroup.add(plane)
scene.add(camGroup);

const options = {
    num: 300000,
    size: 1,
    noiseScale: 0.1
}

const noise = new ImprovedNoise();

// Debug
var gui = new dat.GUI()
gui.add(options, 'num').min(1000).max(300000).step(10000).name('particles').onChange(createGeometry);
gui.add(options, 'noiseScale').min(0.001).max(0.3).step(0.001).name('perlin noise').onChange(createGeometry);
gui.add(options, 'size').min(1).max(10).step(1).name('size').onChange(createGeometry);
gui.close()

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

function createGeometry() {
    //clean old ref for re-render
    scene.remove(scene.getObjectByName('particleSystem'));

    const positions = new Float32Array(options.num * 3); // array of particle positions
    const particleGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < options.num; i += 3) {
        const x = Math.random() * sizes.width;
        const y = Math.random() * sizes.height;
        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = 0; // Z coordinate (2D)
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.name = 'particleGeometry'

    const particleMaterial = new THREE.PointsMaterial({
        size: options.size,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        color: 0x555555
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.name = 'particleSystem'
    particleSystem.sortParticles = true;

    scene.add(particleSystem);
}

function onScreen(px, py) {
    return px > 0 && px < sizes.width && py > 0 && py < sizes.height;
}

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    preserveDrawingBuffer: true,
    antialias: true,
    autoClearColor: false
});

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Animate
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = clock.getDelta()

    let particleGeometry = scene.getObjectByName('particleSystem').geometry;

    for (let i = 0; i < options.num; i++) {
        let px = particleGeometry.attributes.position.array[i * 3];
        let py = particleGeometry.attributes.position.array[i * 3 + 1];

        let n = noise.noise(px * options.noiseScale, py * options.noiseScale, 0);
        let a = (Math.PI * 2) * n;
        px += Math.cos(a);
        py += Math.sin(a);
        particleGeometry.attributes.position.array[i * 3] = px;
        particleGeometry.attributes.position.array[i * 3 + 1] = py;
        particleGeometry.attributes.position.array[i * 3 + 2] = 0;

        if (!onScreen(px, py)) {
            particleGeometry.attributes.position.array[i * 3] = Math.random()* sizes.width;
            particleGeometry.attributes.position.array[i * 3 + 1] = Math.random()* sizes.height;
            particleGeometry.attributes.position.array[i * 3 + 2] = 0;
        }
    }

    particleGeometry.attributes.position.needsUpdate = true;

    camera.updateProjectionMatrix();

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

createGeometry();
tick()
