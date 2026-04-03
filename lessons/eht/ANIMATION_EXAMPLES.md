# EHT Animation System - Usage Examples

## Overview

`eht-animations.js` provides a complete animation framework with:
- Throttled RAF loop supporting 60 FPS (synced) and 30 FPS (unsynced)
- 20+ easing functions
- Animation queue with pause/resume/cancel
- Canvas effects (blur, phase-noise, vignette)
- Performance monitoring

## Basic Usage

### 1. Animate an Element Property

```javascript
// Animate opacity over 500ms
EHTAnimations.animate(
  'fade-in-title',
  (eased) => {
    document.querySelector('#title').style.opacity = eased;
  },
  500,
  'easeInOutQuad'
);
```

### 2. Animate Multiple Properties

```javascript
// Animate position and opacity together
EHTAnimations.animate(
  'slide-up-panel',
  (eased) => {
    const elem = document.querySelector('.panel');
    elem.style.opacity = eased;
    elem.style.transform = `translateY(${-20 * eased}px)`;
  },
  400,
  'easeOutCubic'
);
```

### 3. With Completion Callback

```javascript
EHTAnimations.animate(
  'build-reconstruction',
  (eased) => {
    renderReconstructionProgress(eased);
  },
  2000,
  'easeInOutQuint',
  () => {
    console.log('Reconstruction complete!');
    showNextStep();
  }
);
```

## Control Animations

### Pause/Resume

```javascript
// Start an animation
EHTAnimations.animate('long-animation', updateFunc, 5000);

// Pause it
EHTAnimations.pauseAnimation('long-animation');

// Resume it
EHTAnimations.resumeAnimation('long-animation');

// Cancel it
EHTAnimations.cancelAnimation('long-animation');
```

### Cancel All

```javascript
// Stop everything
EHTAnimations.cancelAll();
```

## Easing Functions

### Available Easings

```javascript
// Linear
'linear'

// Quadratic
'easeInQuad', 'easeOutQuad', 'easeInOutQuad'

// Cubic
'easeInCubic', 'easeOutCubic', 'easeInOutCubic'

// Quart, Quint, Expo, Circ
'easeInQuart', 'easeOutQuart', 'easeInOutQuart'
'easeInQuint', 'easeOutQuint', 'easeInOutQuint'
'easeInExpo', 'easeOutExpo', 'easeInOutExpo'
'easeInCirc', 'easeOutCirc', 'easeInOutCirc'

// Elastic & Bounce
'easeOutElastic'
'easeOutBounce'

// Smooth step variants
'smoothstep'
'smootherstep'
```

### Get Available Easings

```javascript
const names = EHTAnimations.getEasingNames();
console.log(names); // ['linear', 'easeInQuad', ...]

// Get specific easing function
const easeFn = EHTAnimations.getEasing('easeOutBounce');
const value = easeFn(0.5); // Get eased value at 50% progress
```

## Canvas Effects

### Blur Effect

```javascript
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Apply blur with 5px radius
EHTAnimations.effects.blur(ctx, 5);
```

### Phase Noise (Desynchronization)

```javascript
// Add noise during unsynchronized state
let time = 0;
EHTAnimations.animate(
  'noise-effect',
  (eased, progress) => {
    time = progress * 1000;
    EHTAnimations.effects.phaseNoise(ctx, 0.3, time);
  },
  1000,
  'linear'
);
```

### Vignette (Darkening at Edges)

```javascript
// Add subtle vignette to image
EHTAnimations.effects.vignette(ctx, 0.2, 0.5);

// More intense vignette
EHTAnimations.effects.vignette(ctx, 0.5, 0.7);
```

## Synchronization State

### Set Based on Data Sync

```javascript
// When data is in sync (high quality)
EHTAnimations.setSynchronized(true);  // 60 FPS

// When data is unsynchronized
EHTAnimations.setSynchronized(false); // 30 FPS
```

## Performance Monitoring

### Get Metrics

```javascript
const metrics = EHTAnimations.getMetrics();
console.log(metrics);
// {
//   frameTime: 16.67,  // ms per frame
//   fps: 60,           // current FPS
//   skippedFrames: 2   // frames throttled
// }
```

### Check Active Animations

```javascript
if (EHTAnimations.hasActiveAnimations()) {
  console.log(`${EHTAnimations.getAnimationCount()} animations running`);
}
```

## Practical Examples

### Example 1: Station Baseline Highlight

```javascript
// Highlight a baseline when clicked
function highlightBaseline(baselineId) {
  const elem = document.querySelector(`[data-baseline="${baselineId}"]`);

  EHTAnimations.animate(
    `baseline-${baselineId}`,
    (eased) => {
      // Pulse the element
      elem.style.opacity = 0.5 + eased * 0.5;
      elem.style.transform = `scale(${1 + eased * 0.1})`;
    },
    600,
    'easeOutElastic'
  );
}
```

### Example 2: Resolution Formula Display

```javascript
// Animate formula appearance with cascading text
document.querySelectorAll('.formula-part').forEach((elem, i) => {
  EHTAnimations.animate(
    `formula-${i}`,
    (eased) => {
      elem.style.opacity = eased;
      elem.style.transform = `translateY(${-10 * (1 - eased)}px)`;
    },
    500,
    'easeOutQuad',
    null,
    i * 100  // Stagger by 100ms each
  );
});
```

### Example 3: Reconstruction Progress

```javascript
// Animate reconstruction from 0% to 100%
function animateReconstruction(duration = 3000) {
  const progressBar = document.querySelector('.progress');

  EHTAnimations.animate(
    'reconstruction',
    (eased) => {
      progressBar.style.width = `${eased * 100}%`;
      updateReconstructionImage(eased);
    },
    duration,
    'easeInOutQuint',
    () => {
      showCompletionMessage();
    }
  );
}
```

### Example 4: Desynchronization Blur

```javascript
// Blur canvas when data goes out of sync
function handleDataSync(isSynced) {
  EHTAnimations.setSynchronized(isSynced);

  const canvas = document.querySelector('#reconstruction-canvas');
  const ctx = canvas.getContext('2d');

  if (!isSynced) {
    // Animate blur increasing
    EHTAnimations.animate(
      'sync-blur',
      (eased) => {
        // Redraw and blur
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderReconstruction(ctx);
        EHTAnimations.effects.blur(ctx, eased * 8);
      },
      400,
      'easeOutQuad'
    );
  } else {
    // Animate blur decreasing
    EHTAnimations.animate(
      'sync-blur',
      (eased) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderReconstruction(ctx);
        EHTAnimations.effects.blur(ctx, (1 - eased) * 8);
      },
      600,
      'easeInOutQuad'
    );
  }
}
```

### Example 5: Tooltip Appearance

```javascript
// Show tooltip with bounce animation
function showTooltip(text, x, y) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = text;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  document.body.appendChild(tooltip);

  EHTAnimations.animate(
    'tooltip-show',
    (eased) => {
      tooltip.style.opacity = eased;
      tooltip.style.transform = `scale(${eased})`;
    },
    300,
    'easeOutBounce',
    () => {
      // Remove after delay
      setTimeout(() => {
        EHTAnimations.animate(
          'tooltip-hide',
          (eased) => {
            tooltip.style.opacity = 1 - eased;
          },
          200,
          'easeInQuad',
          () => tooltip.remove()
        );
      }, 2000);
    }
  );
}
```

## CSS Class Integration

### With CSS Animations

```html
<!-- Use CSS classes for simple animations -->
<div class="panel animate-slide-in-up">
  <h2>Result</h2>
</div>

<!-- Utilities for delays and durations -->
<div class="animate-fade-in delay-200 duration-500">
  First step
</div>
<div class="animate-fade-in delay-400 duration-500">
  Second step
</div>
```

### Combined Approach

```javascript
// Use CSS for appearance, JS for interactivity
elem.classList.add('animate-pulse-glow');

EHTAnimations.animate(
  'interactive-pulse',
  (eased) => {
    // JavaScript-based value interpolation
    elem.style.borderColor = interpolateColor(
      startColor,
      endColor,
      eased
    );
  },
  800,
  'easeInOutQuad'
);
```

## Best Practices

1. **Use Unique IDs**: Always give animations unique IDs to avoid conflicts
2. **Cleanup**: Cancel animations when elements are removed from DOM
3. **Batch Updates**: Group related property updates in one animate call
4. **Easing Selection**: Choose easing based on interaction type:
   - Entrance: `easeOutQuad`, `easeOutCubic`
   - Emphasis: `easeOutElastic`, `easeOutBounce`
   - Exit: `easeInQuad`, `easeInCubic`
   - Smooth transitions: `easeInOutQuad`, `smootherstep`
5. **Performance**: Monitor metrics, especially on mobile devices
6. **Sync State**: Toggle `setSynchronized()` based on data quality
