# Codex Prompt: VR Museum Patch & Section Upload

## Objective
Patch the Virtual Reality Museum viewer and implement organized section management for curated model collections.

## Current State
- **Upload System**: Working form at `lessons/virtual-reality-museum-upload.html`
- **Model Data**: `data/museum-models.json` contains 11 sample models (animals, artifacts, landmarks)
- **Viewer App**: `apps/virtual-reality-museum/` with viewer.js, viewer.css, index.html
- **Models**: Currently loaded from external sources (Three.js, Khronos, etc.)

## Tasks to Complete

### 1. Fix Museum Viewer Issues
- Review `apps/virtual-reality-museum/viewer.js` for any broken model loading or rendering bugs
- Verify AR/VR mode functionality (if implemented)
- Check camera controls and model scaling (use scaleMultiplier from JSON)
- Ensure responsive layout on mobile, VR headsets, and desktop

### 2. Implement Section Management
- Add section filtering UI (e.g., "All Models", "Animals", "Artifacts", "Landmarks")
- Filter models by `artifact_type` field from museum-models.json
- Add search/sort functionality (by title, date_uploaded, student name)
- Display model count per section

### 3. Enhance Model Cards
- Show metadata: student name, date uploaded, artifact type
- Add description preview with "full view" toggle
- Display source and license information
- Add attribution links for models from external sources

### 4. Upload Integration
- Connect upload form submission to append new models to museum-models.json
- Validate GLB file format and size (max 50 MB)
- Generate unique model IDs (format: `{artifact-type}-{timestamp}-{random}`)
- Auto-scale and optimize uploaded models using scaleMultiplier

### 5. Performance & Scaling
- Lazy-load models (load on demand, not all at startup)
- Implement LOD (Level of Detail) for large model counts
- Cache loaded models in session storage
- Preload next 2-3 models while user browses current one

### 6. Testing Checklist
- [ ] All 11 sample models load without errors
- [ ] Section filtering works for each artifact_type
- [ ] Search/sort responds instantly
- [ ] Responsive design works on mobile (375px width)
- [ ] VR mode loads if Three.js XR is available
- [ ] Model descriptions render with proper formatting
- [ ] Attribution and source links are clickable
- [ ] Upload form validates file before processing

## File Locations
- Viewer: `apps/virtual-reality-museum/viewer.js` (main logic)
- Styles: `apps/virtual-reality-museum/viewer.css`
- HTML: `apps/virtual-reality-museum/index.html`
- Upload Form: `lessons/virtual-reality-museum-upload.html`
- Upload Script: `lessons/virtual-reality-museum/upload.js`
- Model Data: `data/museum-models.json`

## Success Criteria
✓ Museum displays all models from JSON in organized sections  
✓ Section filtering UI is intuitive and performant  
✓ New models can be uploaded and appear in museum immediately  
✓ No console errors on initial load or during model interactions  
✓ VR/AR modes functional if supported by device  

---
**Priority**: High | **Estimated Effort**: 4-6 hours | **Dependencies**: Three.js, A-Frame (if VR)
