# Blockopolis Model QA

Audit date: 2026-07-28

## Validation

- 41 GLTF models inspected.
- All referenced BIN buffers and texture files exist.
- All declared buffer lengths are valid.
- Every model has finite position bounds and at least one renderable mesh.
- All models use the shared KayKit atlas and remain within the expected low-poly style.
- All road and base pieces retain the required 2 x 2 lot footprint.
- Every model has an assigned gameplay or environmental purpose.

## Purpose Map

| Model | Purpose | QA result |
| --- | --- | --- |
| `base` | Zone and service lot foundation | Pass; exact 2 x 2 footprint |
| `bench` | Residential detail, parks, libraries, and city hall | Pass; intentionally scaled up in scene |
| `box_A`, `box_B` | Empty-zone markers and level-one industrial freight | Pass |
| `building_A` | Residential level 1 | Pass |
| `building_A_withoutBase` | School | Pass; generic facade needs UI marker |
| `building_B` | Residential level 2 | Pass |
| `building_B_withoutBase` | Police station | Pass; police car provides role cue |
| `building_C` | Industrial level 2 | Pass |
| `building_C_withoutBase` | Sanitation depot | Pass; dumpster and trash provide role cues |
| `building_D` | Commercial level 2 | Pass |
| `building_D_withoutBase` | Hospital | Pass; generic facade needs UI marker |
| `building_E` | Residential level 3 | Pass |
| `building_E_withoutBase` | Fire station | Pass; hydrants provide role cues |
| `building_F` | Commercial level 1 | Pass |
| `building_F_withoutBase` | Library | Pass; bench provides role cue |
| `building_G` | Industrial level 3 | Pass |
| `building_G_withoutBase` | Power plant and city hall | Usable, but the two roles share a silhouette |
| `building_H` | Commercial level 3 | Pass |
| `building_H_withoutBase` | Transit depot | Pass; taxi and sedan provide role cues |
| `bush` | Empty-land detail, parks, and surrounding terrain | Pass; scale varies intentionally |
| `car_hatchback` | Civilian road traffic | Pass |
| `car_sedan` | Civilian traffic and transit depot | Pass |
| `car_stationwagon` | Civilian road traffic | Pass |
| `car_taxi` | Civilian traffic and transit depot | Pass |
| `car_police` | Police station | Pass; removed from routine civilian traffic |
| `dumpster` | Industry, power plant, and sanitation depot | Pass |
| `firehydrant` | Road detail, hospital, and fire station | Pass |
| `road_corner` | Square road corner | Pass; connections align |
| `road_corner_curved` | Curved road-corner variation | Pass; same 2 x 2 connections |
| `road_junction` | Four-way intersection | Pass |
| `road_straight` | Straight road and dead ends | Pass |
| `road_straight_crossing` | Straight road beside developed lots | Pass |
| `road_tsplit` | Three-way intersection | Pass |
| `streetlight` | Road lighting detail | Pass |
| `trafficlight_A` | Compact intersection signal | Pass |
| `trafficlight_B` | Signal with streetlight | Pass |
| `trafficlight_C` | Overhead intersection signal | Pass; largest signal but fits one lot |
| `trash_A`, `trash_B` | Ground litter and sanitation detail | Pass |
| `watertower` | Water utility | Pass; display scale increased for legibility |

## Corrections Made

- Status and service markers now derive their height from model bounds, preventing them from being hidden inside tall buildings.
- The power-plant chimney and warning lamp now extend above the `building_G_withoutBase` roof.
- The water tower was enlarged from 1.75x to 2.5x for a clearer utility silhouette.
- `car_police` was removed from the general traffic pool and retained at police stations.

## Remaining Limitations

- The pack contains generic mixed-use buildings rather than dedicated school, hospital, library, fire, power, or government architecture.
- Zone buildings and civic services therefore share several facade families.
- `building_G_withoutBase` represents both the power plant and city hall. Procedural props and colored markers distinguish them, but a dedicated model would improve recognition.
- All assets use one atlas material, so realistic glass, metal, emissive windows, and facade-specific roughness require mesh or material separation.
