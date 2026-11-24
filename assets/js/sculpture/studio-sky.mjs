// Six painted cube faces keep the workshop stationary as the camera turns.
export function studioSky(THREE) {
  function face(wall) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const rect = (color, x, y, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    rect('#574536', 0, 0, 512, 512);
    if (wall === 2 || wall === 3) {
      const ceiling = wall === 2;
      rect(ceiling ? '#93806a' : '#574536', 0, 0, 512, 512);
      for (let x = 16; x < 512; x += 96) rect(ceiling ? '#675747' : '#504032', x, 0, ceiling ? 12 : 2, 512);
      return canvas;
    }
    const plaster = ctx.createLinearGradient(0, 0, 0, 385);
    plaster.addColorStop(0, '#93806a');
    plaster.addColorStop(.52, '#b8a593');
    plaster.addColorStop(1, '#897866');
    rect(plaster, 0, 0, 512, 385);
    if (wall === 0 || wall === 5) {
      rect('#78624f', 44, 88, 424, 184);
      const glass = ctx.createLinearGradient(0, 96, 0, 260);
      glass.addColorStop(0, '#d9e0d7');
      glass.addColorStop(.65, '#bbc9b8');
      glass.addColorStop(1, '#8a9a80');
      rect(glass, 52, 96, 408, 168);
      for (const x of [152, 254, 356]) rect('#8e7963', x, 96, 5, 168);
      rect('#8e7963', 52, 171, 408, 5);
      rect('#705948', 36, 268, 440, 7);
    } else {
      for (const y of [176, 269]) {
        for (let i = 0; i < 7; i++) {
          const x = 60 + i * 65;
          const h = 21 + (i * 13 + y) % 28;
          const w = 13 + (i * 9) % 11;
          ctx.fillStyle = ['#986f59', '#8b9080', '#c4b39c'][(i + y) % 3];
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y);
          ctx.bezierCurveTo(x - w * 1.6, y - h * .8, x - w / 3, y - h * .65, x - w / 2, y - h);
          ctx.lineTo(x + w / 2, y - h);
          ctx.bezierCurveTo(x + w / 3, y - h * .65, x + w * 1.6, y - h * .8, x + w / 2, y);
          ctx.fill();
        }
        rect('#705847', 24, y, 464, 8);
      }
    }
    rect('#76604d', 0, 380, 512, 5);
    return canvas;
  }
  const texture = new THREE.CubeTexture(Array.from({ length: 6 }, (_, i) => face(i)));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
