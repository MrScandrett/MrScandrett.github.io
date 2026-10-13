# Hokusai lesson artwork

The lesson uses photographic reproductions of specific historical works rather than generated imitations. `sources.json` records original download URLs, source records, rights, output filenames, and SHA-256 hashes of the downloaded JPEGs.

- Great Wave: The Met, JP1847, photograph DP130155; ca. 1830–32.
- Red Fuji: The Met, JP2960, photograph DP141053; ca. 1830–32.
- Self-portrait as an old man: the documented Wikimedia Commons reproduction, 1839. Its source description does not identify the original photograph provider.
- Drawing manual: BnF, RESERVE 4-DD-527, *Ryakuga hayaoshie*, 1812; scan images 15 and 31 of 54 via Wikimedia Commons. Image numbers identify the scan sequence, not printed page numbers.

To rebuild, download the JPEGs in `sources.json` using the specified input filenames, then run:

```sh
node scripts/build-hokusai-art.mjs /path/to/downloaded-jpegs
```

Web copies are resized and compressed, without recoloring, sharpening, invented marks, or generated paper texture. The full-resolution Great Wave lightbox copy is lossless. The drawing activity crossfades between independent original illustrations cropped from a page; it does not simulate historically registered drawing stages. Full source pages remain available in the classroom lightbox.

The print studio splits the photograph into approximate exclusive pixel regions. These are digital teaching masks, not recovered historical woodblocks, pigment identifications, or a claimed historical printing order. At the original settings it draws the photograph directly. Geometry annotations are classroom interpretations, not proof of Hokusai’s use of equations.
