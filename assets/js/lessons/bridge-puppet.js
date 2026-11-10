/* Practical miniature presentation; structural physics remain in bridge-lab-core. */
window.BridgePuppet = function ({ displayNodes, bridgeState, testState, ambulance, findRoadPath, locateVehicle }) {
  let puppetX = 120;
  let puppetY = 156;
  let puppetAngle = 0;
  const testing = testState.running || testState.finished;
  const path = testing ? testState.path : findRoadPath(bridgeState, bridgeState.nodes);
  const vehicle = path && locateVehicle(path, displayNodes, testing ? testState.progress : 0);

  if (vehicle) {
    const bounce = testState.running
      ? Math.sin(testState.elapsedMs / 165) * Math.min(1.1, 0.3 + testState.maxSag * 0.025)
      : 0;
    puppetX = vehicle.x;
    puppetY = vehicle.y - 14 + bounce;
    puppetAngle = vehicle.angle;
  }

  const strings = ambulance.ownerSVGElement.querySelector('#bridge-puppet-strings');
  // Retain these elements through each physics tick; only attachment positions change.
  if (!strings.firstElementChild) {
    strings.innerHTML = [0, 1].map(() => '<g><path class="bridge-puppet-string-shadow" fill="none"/><path class="bridge-puppet-string" fill="none"/><circle r=".8" fill="#ddd2aa" stroke="#6d7760" stroke-width=".3"/></g>').join('');
  }
  [-24, 9].forEach((x, index) => {
    const px = puppetX + x * Math.cos(puppetAngle) + 16 * Math.sin(puppetAngle);
    const py = puppetY + x * Math.sin(puppetAngle) - 16 * Math.cos(puppetAngle);
    const attachment = strings.children[index];
    attachment.children[0].setAttribute('d', `M${(px - 5.5).toFixed(1)} 12L${(px + 0.5).toFixed(1)} ${py.toFixed(1)}`);
    attachment.children[1].setAttribute('d', `M${(px - 6).toFixed(1)} 12L${px.toFixed(1)} ${py.toFixed(1)}`);
    attachment.children[2].setAttribute('cx', px.toFixed(1));
    attachment.children[2].setAttribute('cy', py.toFixed(1));
  });
  ambulance.querySelectorAll('.bridge-wheel').forEach(wheel => {
    const rotation = (puppetX - 120) / 6.4 * 180 / Math.PI;
    wheel.setAttribute('transform', `rotate(${rotation.toFixed(1)} ${wheel.dataset.wheelX} ${wheel.dataset.wheelY})`);
  });
  ambulance.setAttribute('transform', `translate(${puppetX.toFixed(1)} ${puppetY.toFixed(1)}) rotate(${(puppetAngle * 180 / Math.PI).toFixed(1)})`);
  ambulance.setAttribute('opacity', '1');
};
