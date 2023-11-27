import * as THREE from 'three';
import * as dat from 'lil-gui';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

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

const camGroup = new THREE.Group();
camGroup.add(camera);
scene.add(camGroup);

const noise = new SimplexNoise();

const options = {
    num: 300000,
    size: 1,
    noiseScale: 0.1,
    inverted: false,
    angleType: 'static',
    znoise: false,
    cosScale: 1,
    sinScale: 1,
    //trailing: false,
    //damping: 0.9,
}

const fromLS = localStorage.getItem('options');
if (fromLS) {
    const parsed = JSON.parse(fromLS);
    options.num = parsed.num || 300000;
    options.size = parsed.size || 1;
    options.noiseScale = parsed.noiseScale || 0.1;
    options.inverted = parsed.inverted || false;
    options.angleType = parsed.angleType || 'static';
    options.znoise = parsed.znoise || false;
    options.cosScale = parsed.cosScale || 1;
    options.sinScale = parsed.sinScale || 1;
    //options.trailing = parsed.trailing || false;
    //options.damping = parsed.damping || 0.9;
}

//TODO: fix trailing
function updateComposer() {
    // if (options.trailing) {
    //     composer.addPass(afterImagePass);
    //     //afterImagePass.uniforms.damp.value = options.damping;
    // }
    // else {
    //     composer.removePass(afterImagePass);
    // }
}
function onControlsChange() {
    localStorage.setItem('options', JSON.stringify(options));
    //updateComposer();
    createGeometry();
}

// Controls
var gui = new dat.GUI()
gui.add(options, 'num').min(1000).max(300000).step(10000).name('particles').onChange(onControlsChange);
gui.add(options, 'noiseScale').min(0.001).max(0.3).step(0.001).name('simplex noise scale').onChange(onControlsChange);
gui.add(options, 'size').min(1).max(10).step(1).name('size').onChange(onControlsChange);
gui.add(options, 'inverted').name('invert').onChange(onControlsChange);
gui.add(options, 'angleType').name('angle type').options(['static', '* time','+ time']).onChange(onControlsChange);
gui.add(options, 'znoise').name('z noise').onChange(onControlsChange);
gui.add(options, 'cosScale').min(1).max(10).step(0.1).name('cos scale').onChange(onControlsChange);
gui.add(options, 'sinScale').min(1).max(10).step(0.1).name('sin scale').onChange(onControlsChange);
//gui.add(options, 'trailing').name('trailing').onChange(onControlsChange);
// gui.add(options, 'damping').min(0.0).max(0.99).step(0.01).name('damping').onChange(onControlsChange);
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

document.getElementById('screenshot').addEventListener('click', screenshot);

function createGeometry() {
    //clean old ref for re-render
    scene.remove(scene.getObjectByName('particleSystem'));

    //change renderer background given inverted state
    renderer.setClearColor(options.inverted ? 0xffffff : 0x000000);

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
        color: options.inverted ? 0x000000 : 0xffffff,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.name = 'particleSystem'
    particleSystem.sortParticles = true;

    scene.add(particleSystem);
}

function onScreen(px, py) {
    return px > 0 && px < sizes.width && py > 0 && py < sizes.height;
}
let zoff = 0;
// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    preserveDrawingBuffer: true,
    antialias: true,
    autoClearColor: false
});

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Postprocessing
const renderScene = new RenderPass(scene, camera);
// const afterImagePass = new AfterimagePass();

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);

updateComposer();

// Animate
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = clock.getDelta()

    let particleGeometry = scene.getObjectByName('particleSystem').geometry;

    zoff += 0.01;

    for (let i = 0; i < options.num; i++) {
        let px = particleGeometry.attributes.position.array[i * 3];
        let py = particleGeometry.attributes.position.array[i * 3 + 1];

        let n;

        if (options.znoise) {
            n = noise.noise3d(px * options.noiseScale, py * options.noiseScale, zoff);
        }
        else {
            n = noise.noise(px * options.noiseScale, py * options.noiseScale);
        }

        let a;

        switch (options.angleType) {
            case 'static':
                a = (Math.PI * 2) * n;
                break;
            case '* time':
                a = (Math.PI * 2) * n * elapsedTime;
                break;
            case '+ time':
                a = (Math.PI * 2) * n + elapsedTime;
                break;
            default:
                a = (Math.PI * 2) * n;
                break;
        }

        px += Math.cos(a) * options.cosScale;
        py += Math.sin(a) * options.sinScale;

        particleGeometry.attributes.position.array[i * 3] = px;
        particleGeometry.attributes.position.array[i * 3 + 1] = py;
        particleGeometry.attributes.position.array[i * 3 + 2] = 0;

        if (!onScreen(px, py)) { //re-inject particle in canvas at a randomized vector if out of screen
            particleGeometry.attributes.position.array[i * 3] = Math.random() * sizes.width;
            particleGeometry.attributes.position.array[i * 3 + 1] = Math.random() * sizes.height;
            particleGeometry.attributes.position.array[i * 3 + 2] = 0;
        }
    }

    particleGeometry.attributes.position.needsUpdate = true;

    camera.updateProjectionMatrix();

    // Render
    composer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

createGeometry();
tick()

function screenshot () {
    const fname =  `fields-${Date.now()}`
    const w = window.open('', '');
    w.document.title = fname;

    const img = new Image();
    img.src = renderer.domElement.toDataURL();
    w.document.body.appendChild(img);

    const a = document.createElement('a');
    a.href = renderer.domElement.toDataURL().replace("image/png", "image/octet-stream");
    a.download = `${fname}.png`;
    a.click();
}