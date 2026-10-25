import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from '../assets/vendor/three-bundle.min.js';
import { createRig, createPointer } from '../assets/js/xr-kit.mjs';

// Just enough renderer/canvas for createPointer to run headless.
function harness() {
  const xr = new THREE.EventDispatcher();
  const controllers = [new THREE.Group(), new THREE.Group()];
  xr.isPresenting = false;
  xr.getController = i => controllers[i];
  xr.getCamera = () => camera;
  const renderer = { xr };
  const canvas = {
    style: {},
    tabIndex: 0,
    addEventListener() {},
    hasAttribute: () => true,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 })
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  const rig = createRig(THREE, scene, camera);
  const wall = new THREE.Group();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
  panel.position.z = -3;
  wall.add(panel);
  scene.add(wall);
  const hovers = [];
  const pointer = createPointer(THREE, renderer, { rig, camera, canvas, targets: () => [wall], onHover: o => hovers.push(o) });
  function enterVR() {
    xr.isPresenting = true;
    controllers[0].dispatchEvent({ type: 'connected', data: { targetRayMode: 'tracked-pointer', gamepad: null } });
    scene.updateMatrixWorld(true);
  }
  return { xr, scene, wall, panel, pointer, hovers, enterVR };
}

test('laser hover follows the controller and is cleared when VR ends', () => {
  const h = harness();
  h.enterVR();
  h.pointer.update();
  assert.equal(h.hovers.at(-1), h.wall, 'pointing at the wall hovers it');
  const dot = h.scene.children.find(o => o.geometry?.type === 'SphereGeometry');
  assert.ok(dot.visible, 'hit dot shows while presenting');

  h.xr.isPresenting = false;
  h.xr.dispatchEvent({ type: 'sessionend' });
  assert.equal(h.hovers.at(-1), null, 'hover highlight is cleared on exit');
  assert.equal(dot.visible, false, 'hit dot is hidden on exit');
});

test('a hidden parent hides its children from the laser', () => {
  const h = harness();
  h.enterVR();
  h.wall.visible = false;
  h.pointer.update();
  assert.equal(h.hovers.at(-1) ?? null, null);
  h.wall.visible = true;
  h.pointer.update();
  assert.equal(h.hovers.at(-1), h.wall);
});
