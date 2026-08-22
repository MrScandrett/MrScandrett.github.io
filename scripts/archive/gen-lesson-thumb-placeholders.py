#!/usr/bin/env python3
"""Generate flat SVG placeholder thumbnails for lessons whose photos were lost.

Each is a 400x200 band (close to the .lotd-photo display aspect so `cover`
crops as little as possible) with a topical geometric motif drawn in the
lesson's own accent color.
"""
import os

OUT = "assets/thumbs"

# filename -> (accent color, motif key)
LESSONS = {
    "pemdas":          ("#3b82f6", "pemdas"),
    "antique-scale":   ("#3b82f6", "scale"),
    "watch-gears":     ("#eab308", "gears"),
    "enigma-machine":  ("#06b6d4", "enigma"),
    "morse-telegraph": ("#06b6d4", "morse"),
    "chess-board":     ("#a855f7", "chess"),
    "eniac":           ("#a855f7", "circuit"),
    "punched-cards":   ("#a855f7", "punchcard"),
    "space-invaders":  ("#a855f7", "invader"),
    "arpanet-1973":    ("#94a3b8", "network"),
    "gutenberg-bible": ("#94a3b8", "book"),
}

W, H = 400, 200


def shade(hex_color, factor):
    """Lighten (factor>1) or darken (factor<1) a #rrggbb color."""
    c = hex_color.lstrip("#")
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    f = lambda v: max(0, min(255, int(v * factor)))
    return f"#{f(r):02x}{f(g):02x}{f(b):02x}"


def motif_pemdas(a, lt, dk):
    parts = [f'<text x="200" y="122" font-family="Georgia, serif" font-size="86" '
             f'font-weight="700" fill="{lt}" text-anchor="middle">( )</text>']
    for i, (sx, sy, op) in enumerate([(96, 60, "+"), (304, 60, "×"),
                                      (96, 150, "−"), (304, 150, "÷")]):
        parts.append(f'<circle cx="{sx}" cy="{sy}" r="21" fill="{dk}"/>')
        parts.append(f'<text x="{sx}" y="{sy + 10}" font-family="Georgia, serif" '
                     f'font-size="27" font-weight="700" fill="#fff" '
                     f'text-anchor="middle">{op}</text>')
    return "".join(parts)


def motif_scale(a, lt, dk):
    return (
        f'<rect x="196" y="52" width="8" height="104" rx="3" fill="{dk}"/>'
        f'<rect x="160" y="152" width="80" height="10" rx="4" fill="{dk}"/>'
        f'<rect x="96" y="56" width="208" height="8" rx="4" fill="{lt}" '
        f'transform="rotate(-7 200 60)"/>'
        f'<circle cx="200" cy="46" r="10" fill="{lt}"/>'
        f'<path d="M92 74 L66 122 L146 122 Z" fill="{lt}" opacity="0.92"/>'
        f'<path d="M308 86 L286 128 L350 128 Z" fill="{dk}" opacity="0.92"/>'
    )


def motif_gears(a, lt, dk):
    def gear(cx, cy, r, teeth, fill):
        p = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>']
        for i in range(teeth):
            ang = 360 / teeth * i
            p.append(f'<rect x="{cx - 6}" y="{cy - r - 11}" width="12" height="14" '
                     f'rx="2" fill="{fill}" transform="rotate({ang} {cx} {cy})"/>')
        p.append(f'<circle cx="{cx}" cy="{cy}" r="{r * 0.34:.0f}" fill="#1f2937"/>')
        return "".join(p)
    return gear(148, 100, 46, 10, lt) + gear(256, 68, 30, 8, dk) + gear(272, 148, 24, 7, dk)


def motif_enigma(a, lt, dk):
    p = [f'<rect x="70" y="44" width="260" height="112" rx="10" fill="{dk}"/>']
    for i in range(3):
        cx = 130 + i * 70
        p.append(f'<circle cx="{cx}" cy="82" r="24" fill="{lt}"/>')
        p.append(f'<circle cx="{cx}" cy="82" r="10" fill="#0f172a"/>')
    for r in range(2):
        for c in range(8):
            p.append(f'<circle cx="{100 + c * 29}" cy="{124 + r * 20}" r="6.5" '
                     f'fill="{lt}" opacity="0.75"/>')
    return "".join(p)


def motif_morse(a, lt, dk):
    p, x = [], 44
    # ". . .  - - -  . . ."  (SOS)
    for token in ".. . - - - . ..":
        if token == ".":
            p.append(f'<circle cx="{x + 9}" cy="100" r="9" fill="{lt}"/>')
            x += 30
        elif token == "-":
            p.append(f'<rect x="{x}" y="91" width="40" height="18" rx="9" fill="{dk}"/>')
            x += 56
        else:
            x += 12
    p.append(f'<rect x="40" y="140" width="320" height="5" rx="2.5" fill="{dk}" opacity="0.5"/>')
    return "".join(p)


def motif_chess(a, lt, dk):
    p = []
    size, off_x, off_y = 25, 100, 0
    for r in range(8):
        for c in range(8):
            if (r + c) % 2 == 0:
                continue
            p.append(f'<rect x="{off_x + c * size}" y="{off_y + r * size}" '
                     f'width="{size}" height="{size}" fill="{lt}"/>')
    p.insert(0, f'<rect x="{off_x}" y="{off_y}" width="{size * 8}" height="{size * 8}" fill="{dk}"/>')
    return "".join(p)


def motif_circuit(a, lt, dk):
    p = [f'<rect x="84" y="46" width="232" height="108" rx="8" fill="{dk}"/>',
         f'<rect x="112" y="70" width="176" height="60" rx="4" fill="#0f172a"/>']
    for i in range(6):
        x = 126 + i * 30
        p.append(f'<rect x="{x}" y="82" width="14" height="36" rx="2" fill="{lt}" '
                 f'opacity="{0.45 + (i % 3) * 0.25:.2f}"/>')
    for i in range(9):
        x = 96 + i * 26
        p.append(f'<rect x="{x}" y="156" width="8" height="14" rx="2" fill="{lt}"/>')
    return "".join(p)


def motif_punchcard(a, lt, dk):
    # card body with the classic clipped top-left corner
    p = [f'<path d="M74 40 L96 22 H326 V178 H74 Z" fill="{lt}"/>']
    cols, rows = 16, 9
    x0, y0, dx, dy = 88, 40, 14.5, 14
    punched = {
        0: 3, 1: 6, 2: 0, 3: 5, 4: 8, 5: 2, 6: 6, 7: 1,
        8: 4, 9: 7, 10: 3, 11: 0, 12: 5, 13: 8, 14: 2, 15: 6,
    }
    for c in range(cols):
        for r in range(rows):
            x = x0 + c * dx
            y = y0 + 18 + r * dy
            if punched.get(c) == r:
                p.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="9" height="9.5" '
                         f'rx="1.5" fill="{dk}"/>')
            else:
                p.append(f'<rect x="{x:.1f}" y="{y + 2.5:.1f}" width="9" height="4" '
                         f'rx="1" fill="{dk}" opacity="0.2"/>')
    return "".join(p)


def motif_invader(a, lt, dk):
    grid = [
        "0011001100",
        "0111111110",
        "1101111011",
        "1111111111",
        "0011001100",
        "0110011011",
    ]
    px, ox, oy = 22, 90, 40
    p = []
    for r, row in enumerate(grid):
        for c, ch in enumerate(row):
            if ch == "1":
                p.append(f'<rect x="{ox + c * px}" y="{oy + r * px}" '
                         f'width="{px}" height="{px}" fill="{lt}"/>')
    return "".join(p)


def motif_network(a, lt, dk):
    nodes = [(70, 60), (170, 40), (280, 72), (340, 140), (210, 150), (100, 140)]
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (1, 4), (2, 4)]
    p = []
    for i, j in edges:
        x1, y1 = nodes[i]
        x2, y2 = nodes[j]
        p.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                 f'stroke="{dk}" stroke-width="3.5" opacity="0.85"/>')
    for x, y in nodes:
        p.append(f'<circle cx="{x}" cy="{y}" r="15" fill="{lt}"/>')
        p.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#0f172a" opacity="0.55"/>')
    return "".join(p)


def motif_book(a, lt, dk):
    p = [f'<path d="M200 58 C168 40 118 40 92 50 V158 C118 148 168 148 200 164 Z" fill="{lt}"/>',
         f'<path d="M200 58 C232 40 282 40 308 50 V158 C282 148 232 148 200 164 Z" fill="{dk}"/>',
         f'<rect x="196" y="56" width="8" height="108" rx="3" fill="#0f172a" opacity="0.45"/>']
    for i in range(5):
        y = 70 + i * 17
        p.append(f'<rect x="112" y="{y}" width="70" height="5" rx="2.5" fill="#f8fafc" opacity="0.65"/>')
        p.append(f'<rect x="218" y="{y}" width="70" height="5" rx="2.5" fill="#f8fafc" opacity="0.5"/>')
    return "".join(p)


MOTIFS = {
    "pemdas": motif_pemdas, "scale": motif_scale, "gears": motif_gears,
    "enigma": motif_enigma, "morse": motif_morse, "chess": motif_chess,
    "circuit": motif_circuit, "punchcard": motif_punchcard,
    "invader": motif_invader, "network": motif_network, "book": motif_book,
}


def build(name, accent, motif_key):
    bg_dark = shade(accent, 0.28)
    bg_mid = shade(accent, 0.45)
    light = shade(accent, 1.35)
    deep = shade(accent, 0.78)
    body = MOTIFS[motif_key](accent, light, deep)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}" role="img">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{bg_mid}"/>'
        f'<stop offset="1" stop-color="{bg_dark}"/></linearGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
        f'{body}</svg>\n'
    )


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (accent, motif) in LESSONS.items():
        path = os.path.join(OUT, f"{name}.svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(build(name, accent, motif))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
