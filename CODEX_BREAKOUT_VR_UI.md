# Codex Prompt: Fix A-Frame Breakout VR UI

## Problem
The Breakout game in the VR "How it Works" lesson has **no UI visible in VR mode**. Users cannot start the game, reset, or access settings once they put on the headset.

**Current state:**
- Desktop buttons (Start/Reset/Enter VR) are in HTML footer outside A-Frame scene
- These buttons disappear when entering VR mode
- Score and status text only visible on desktop
- VR controllers are set up with raycaster but no targets to click

## Location
**File:** `lessons/vr-technology.html`  
**Scene:** `#breakout-scene` (A-Frame scene starting ~line 945)  
**Game script:** Lines 1607–1930 (Breakout game logic)  

## Tasks

### 1. Create VR UI Panel (Inside A-Frame Scene)
Add a 3D billboard panel in the scene that displays:
- **Score:** Real-time score display (linked to `#vr-breakout-score`)
- **Status:** Game status text (linked to `#vr-breakout-status`)
- **Buttons:** Start/Pause, Reset, Exit VR as 3D clickable buttons

**Requirements:**
- Position above the game play area (e.g., Y: 2.8, facing camera)
- Make it a transparent plane with text rendered via A-Frame text component or Canvas texture
- Ensure it's **always visible** but doesn't block gameplay
- Use semi-transparent background so it doesn't obstruct the scene

**Approach:**
- Create `<a-plane>` for the panel background
- Add three `<a-box>` elements as button targets (with class="vr-ui-target")
- Use A-Frame text component or custom material for labels
- Keep buttons large enough for VR interaction (minimum ~0.3m wide)

### 2. Update Raycaster Targets
The scene already has raycasters on left and right controllers pointing to `.vr-ui-target`:
```html
<a-entity id="left-hand" laser-controls="hand: left" raycaster="objects: .vr-ui-target"></a-entity>
```

**Need:**
- Assign `class="vr-ui-target"` to the three button boxes
- Add data attributes to distinguish button purpose: `data-button="start"`, `data-button="reset"`, `data-button="exit"`
- Wire up raycaster intersection events to trigger button clicks

### 3. Wire Raycaster Events
In the game script, listen for raycaster click/intersection events:
- `raycaster-intersected` → highlight button (emit light, change color)
- `raycaster-intersected-cleared` → unhighlight
- `click` event on raycaster target → trigger the appropriate game function

**Functions to call from VR button clicks:**
- Start button → `startGame()`
- Reset button → `resetRound()` + `setState('ready')`
- Exit VR button → `scene.exitVR()`

### 4. Show/Hide UI Based on VR Mode
Update the existing `enter-vr` and `exit-vr` event listeners:
- **Enter VR:** Show the 3D panel, hide desktop buttons
- **Exit VR:** Hide the 3D panel, show desktop buttons

```javascript
scene.addEventListener('enter-vr', function() {
  document.getElementById('vr-ui-panel').setAttribute('visible', true);
  document.querySelector('.vr-breakout-foot').style.display = 'none';
  // ... existing code
});
```

### 5. Update Score/Status Display
The score and status need to be visible in VR:
- Link the 3D text labels to the existing `#vr-breakout-score` and `#vr-breakout-status` elements
- OR create new text entities inside the panel and update them from the game script
- Ensure updates happen in real-time as game progresses

### 6. Controller Feedback
Add visual feedback for VR controller interactions:
- Highlight button when raycaster hovers over it (change color/intensity)
- Play a subtle sound or vibration when button is clicked (if supported)
- Show text that changes (e.g., button label changes color on hover)

## Testing Checklist
- [ ] VR buttons are visible and readable in VR headset
- [ ] Raycaster correctly detects intersection with buttons
- [ ] Start button launches game
- [ ] Reset button resets score/bricks and game state
- [ ] Exit VR button leaves VR mode and shows desktop UI
- [ ] Score updates in real-time in VR mode
- [ ] Status text updates (Ready → In Play → Paused → VR Active, etc.)
- [ ] Desktop buttons hidden when in VR, visible when on desktop
- [ ] Buttons don't obstruct game play area
- [ ] No console errors on VR entry/exit

## Implementation Notes

**A-Frame Entity Structure:**
```
<a-entity id="vr-ui-panel" visible="false" position="0 2.8 -4.5">
  <!-- Panel background -->
  <a-plane opacity="0.85" color="#0a0820"></a-plane>
  
  <!-- Score display -->
  <a-text id="vr-score-text" ...></a-text>
  
  <!-- Status display -->
  <a-text id="vr-status-text" ...></a-text>
  
  <!-- Three button boxes with data-button attributes -->
  <a-box class="vr-ui-target" data-button="start" ...></a-box>
  <a-box class="vr-ui-target" data-button="reset" ...></a-box>
  <a-box class="vr-ui-target" data-button="exit" ...></a-box>
</a-entity>
```

**Key Event Listeners:**
```javascript
scene.addEventListener('raycaster-intersected', function(e) {
  // Highlight button
});
scene.addEventListener('click', function(e) {
  var button = e.target.closest('[data-button]');
  if (!button) return;
  // Route to appropriate function
});
```

## Success Criteria
✓ VR panel appears when entering VR mode  
✓ All three buttons are clickable with VR controllers  
✓ Score/status text is readable and updates in real-time  
✓ Game can be started, paused, and reset from VR  
✓ No regression on desktop controls (keyboard, mouse)  
✓ No visual obstruction of gameplay  

---
**Priority:** High | **Estimated Effort:** 2–3 hours | **Dependencies:** A-Frame 1.4.2, WebXR-capable headset for testing
