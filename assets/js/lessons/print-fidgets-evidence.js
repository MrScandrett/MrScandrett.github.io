(() => {
  const card = document.querySelector('[data-pf-evidence]');
  if (!card) return;
  const fields = Object.fromEntries([...card.querySelectorAll('[data-pf-record]')].map(el => [el.dataset.pfRecord, el]));
  const status = card.querySelector('[data-pf-evidence-result]');
  const next = card.querySelector('[data-pf-evidence-next]');
  const key = 'classroomos.print-fidgets.fit-record.v1';

  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) Object.entries(saved).forEach(([name, value]) => {
      const field = fields[name];
      if (!field) return;
      const validOption = field.tagName === 'SELECT' && [...field.options].some(option => option.value === value);
      const validNumber = field.type === 'number' && value !== '' && Number.isFinite(Number(value));
      const validText = field.type === 'text' && typeof value === 'string';
      if (validOption || validNumber || validText) field.value = value;
    });
  } catch (_) { /* A saved draft is optional. */ }

  function render() {
    try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(Object.entries(fields).map(([name, el]) => [name, el.value])))); } catch (_) { /* Storage can be unavailable. */ }
    const comb = fields.comb.valueAsNumber;
    const side = fields.side.valueAsNumber;
    const layer = fields.layer.valueAsNumber;
    const nozzle = fields.nozzle.valueAsNumber;
    const layerHeight = fields.layerHeight.valueAsNumber;
    if (![comb, side, layer, nozzle, layerHeight].every(Number.isFinite) || [comb, side, layer, nozzle, layerHeight].some(value => value <= 0)) {
      status.textContent = 'Enter positive measurements in millimetres before deciding what to test.';
      next.textContent = '';
      return;
    }
    const compare = side < comb ? 'Your planned side gap is narrower than your open-slot result. Check the sliced outlines and consider a larger test gap.' : 'Your planned side gap is at least your open-slot result. This is a starting point; the captured disc still needs a print test.';
    status.textContent = compare;
    const observation = fields.result.value;
    const setupReminder = fields.printer.value.trim() && fields.filament.value.trim() ? '' : ' Add your printer profile and filament so this result can be repeated.';
    next.textContent = ({
      untested: 'Next: verify the cup and disc are separate at several layers in the slicer, then print with supports off.',
      free: 'Evidence: it turns freely. Keep these dimensions with the printer, filament, and slice settings used.',
      stiff: 'Revision: locate the rub. Check first-layer spread, then change only the gap at the contact point and test again.',
      fused: 'Revision: compare the model and sliced preview. If the air vanished in preview, widen that gap; if it survived, inspect the print for spread or sag.'
    }[observation]) + setupReminder;
  }
  card.addEventListener('input', render);
  card.addEventListener('change', render);
  render();
})();
