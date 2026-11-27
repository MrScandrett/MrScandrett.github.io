/* cura-profile.mjs — a .curaprofile for the part Forge just built.
 *
 * Pure (no DOM, no Three.js); tested by tests/forge-cura-profile.test.mjs.
 *
 * A .curaprofile is a ZIP of Cura "quality_changes" containers (INI text).
 * The format below follows UltiMaker Cura 5.10's own importer
 * (CuraProfileReader + CuraContainerRegistry.importProfile):
 *   - one global container is enough: Cura moves per-extruder settings into
 *     extruder 1 itself, and re-targets `definition` to whatever printer is active;
 *   - the profile's name in Cura is the file's name, so the filename matters;
 *   - `quality_type` must be one the active printer has, or Cura refuses the
 *     file. MakerBot Sketch / Sketch Large only have "draft", as do most
 *     Creality-style and Ultimaker printers; a few (Snapmaker 2, Voron, …) only
 *     have "normal". CURA_TARGETS lists the choices the page offers.
 *
 * Only settings that follow from the part are written: layer height from the
 * Forge settings, supports only when the print checks say NEEDS SUPPORTS, a
 * brim when a body stands on a small or tall-and-narrow footprint, stronger
 * walls and infill for gears and mechanisms, and no horizontal expansion so the
 * designed clearances survive. Temperatures, speeds and fan stay with the
 * printer's material profile, where they are safe for that machine.
 */

import { writeZip } from '../fab-io.mjs';

export const CURA_SETTING_VERSION = 25;   // UltiMaker Cura 5.10
export const CURA_TARGETS = [
  { id: 'sketch', label: 'MakerBot Sketch / Sketch Large', quality: 'draft' },
  { id: 'draft', label: 'Creality, Ultimaker and most others', quality: 'draft' },
  { id: 'normal', label: 'Snapmaker 2, Voron and others without a Draft quality', quality: 'normal' },
];

const STRONG_GROUPS = new Set(['Mechanisms', 'Drives']);
const round = (v, places = 2) => Number(Number(v).toFixed(places));

/* Area (mm²) of the faces lying on the bed: down-facing triangles at Z ≈ 0. */
export function bedContact(positions) {
  let area = 0;
  for (let i = 0; i < positions.length; i += 9) {
    if (positions[i + 2] > 0.05 || positions[i + 5] > 0.05 || positions[i + 8] > 0.05) continue;
    const ux = positions[i + 3] - positions[i], uy = positions[i + 4] - positions[i + 1];
    const vx = positions[i + 6] - positions[i], vy = positions[i + 7] - positions[i + 1];
    area += Math.abs(ux * vy - uy * vx) / 2;
  }
  return area;
}

function zRange(positions) {
  let low = Infinity, top = -Infinity;
  for (let i = 2; i < positions.length; i += 3) { low = Math.min(low, positions[i]); top = Math.max(top, positions[i]); }
  return { low, top };
}

/* Decide the settings and say why, in words a student can read.
   result: engine.run() output ({ bodies, verdicts, demo }); settings: { layer, nozzle }. */
export function curaSettings({ result, settings, group }) {
  const layer = Number(settings.layer) || 0.2;
  const values = {};
  const reasons = [];

  values.layer_height = layer;
  values.layer_height_0 = round(Math.max(0.2, layer));
  reasons.push(`${layer} mm layers, the layer height chosen in Forge; a ${values.layer_height_0} mm first layer so it grips the bed.`);

  const strong = STRONG_GROUPS.has(group);
  values.wall_line_count = strong ? 4 : 3;
  values.top_bottom_thickness = round(Math.max(0.8, 3 * layer));
  values.infill_sparse_density = strong ? 30 : 15;
  reasons.push(strong
    ? `${values.wall_line_count} walls and ${values.infill_sparse_density}% infill: teeth and axles carry load.`
    : `${values.wall_line_count} walls and ${values.infill_sparse_density}% infill, the same as Forge's plastic estimate.`);

  const needsSupports = result.verdicts.some((v) => v.tag === 'NEEDS SUPPORTS');
  values.support_enable = needsSupports;
  if (needsSupports) {
    values.support_type = 'everywhere';
    values.support_angle = 45;
    reasons.push('Supports ON under faces past 45°, the red faces in Forge.');
  } else {
    reasons.push('Supports OFF: the print checks found no overhang that needs them (supports would also fill moving gaps).');
  }

  // A brim for any body whose footprint is small or narrow for its height.
  // Captured pieces (a wheel inside its mount) start above the bed and are held by their host.
  const tippy = result.bodies.filter((b) => {
    const { low, top } = zRange(b.positions);
    if (low > 0.05) return false;
    const contact = bedContact(b.positions);
    return contact < 60 || top / Math.sqrt(Math.max(contact, 1e-6)) > 3;
  });
  if (tippy.length) {
    values.adhesion_type = 'brim';
    values.brim_width = 5;
    values.brim_location = 'outside';
    reasons.push(`A 5 mm brim: ${tippy.map((b) => b.name).join(' and ')} stands on a small footprint and could be knocked loose.`);
  } else {
    values.adhesion_type = 'skirt';
    values.skirt_line_count = 2;
    reasons.push('A skirt (no brim): every part sits on a wide, flat base.');
  }

  values.xy_offset = 0;
  values.xy_offset_layer_0 = result.demo ? -0.1 : 0;
  reasons.push(result.demo
    ? 'No horizontal expansion, and the first layer pulled in 0.1 mm so squished plastic cannot weld the moving pieces together.'
    : 'No horizontal expansion, so holes and clearances print the size Forge drew them.');

  values.print_sequence = 'all_at_once';
  values.magic_spiralize = false;
  values.retraction_enable = true;
  values.cool_fan_enabled = true;
  reasons.push('All parts printed together, one layer at a time (one-at-a-time can drive the print head into finished parts).');

  return { values, reasons };
}

const iniValue = (v) => (typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
const iniName = (s) => String(s).replace(/[\r\n[\]=]+/g, ' ').trim().slice(0, 60) || 'Forge part';

/* The INI text of the single global quality_changes container. */
export function curaProfileText({ name, quality = 'draft', values }) {
  const lines = [
    '[general]', 'version = 4', `name = ${iniName(name)}`, 'definition = fdmprinter', '',
    '[metadata]', 'type = quality_changes', `quality_type = ${quality}`, `setting_version = ${CURA_SETTING_VERSION}`, '',
    '[values]',
    ...Object.entries(values).map(([k, v]) => `${k} = ${iniValue(v)}`),
    '',
  ];
  return lines.join('\n');
}

/* → { bytes: Uint8Array (.curaprofile), values, reasons } */
export function writeCuraProfile({ name, result, settings, group, target = 'sketch' }) {
  const quality = (CURA_TARGETS.find((t) => t.id === target) || CURA_TARGETS[0]).quality;
  const { values, reasons } = curaSettings({ result, settings, group });
  const id = iniName(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'forge_part';
  const bytes = writeZip([{ name: `forge_${id}`, data: curaProfileText({ name, quality, values }) }]);
  return { bytes, values, reasons, quality };
}
