#!/usr/bin/env python3
"""Optimise les photos officielles JOE DEV CODES pour le web.

  python3 scripts/process_photos.py     (nécessite Pillow : pip install pillow)

Lit photos-originals/pNN.jpg -> écrit public/photos/pNN-<largeur>.webp et src/data/photos.ts.
Retouches : orientation EXIF, contraste doux, légère remontée des tons sombres, netteté après redimensionnement.
Aucune retouche du visage, aucune génération : uniquement des réglages globaux. Pas de sur-échantillonnage artificiel.
"""
import base64, io, json, os
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

SRC, OUT, TS = 'photos-originals', 'public/photos', 'src/data/photos.ts'
TARGETS = [480, 800, 1080]

# id: (alt, point focal desktop, point focal mobile) — points focaux = object-position CSS
META = {
  'p01': ("Groupe de participants brandissant leurs certificats lors d'un événement", '50% 45%', '50% 45%'),
  'p02': ("Joe Dev en tenue professionnelle lors d'un événement d'innovation et d'entrepreneuriat", '45% 30%', '45% 30%'),
  'p03': ("Joe Dev et un groupe de participants en soirée devant un hôtel", '50% 68%', '50% 70%'),
  'p04': ("Groupe en toge avec leurs attestations devant un panneau d'exposition", '50% 62%', '50% 62%'),
  'p05': ("Joe Dev en toge, étole jaune et médaille, attestation à la main", '55% 30%', '55% 28%'),
  'p06': ("Joe Dev en reportage, micro à la main, devant une haie verte", '50% 28%', '50% 28%'),
  'p07': ("Joe Dev en veste et cravate dans un jardin, à l'entrée d'un bâtiment", '50% 40%', '50% 40%'),
  'p08': ("Joe Dev travaillant sur son ordinateur portable en extérieur", '32% 48%', '30% 48%'),
  'p09': ("Groupe de participants en tenue professionnelle dans un hall moderne", '50% 55%', '50% 55%'),
  'p10': ("Quatre participants posant ensemble après une session", '50% 40%', '50% 40%'),
  'p11': ("Joe Dev en veste noire devant un bâtiment du campus", '30% 52%', '28% 50%'),
  'p12': ("Joe Dev en bonnet, chemise et cravate, veste claire, sur un campus", '50% 22%', '50% 24%'),
  'p13': ("Joe Dev avec son sac devant un bâtiment scolaire", '30% 60%', '28% 62%'),
  'p14': ("Joe Dev assis sur une barrière dans l'herbe, gilet et lunettes", '50% 38%', '50% 36%'),
}

# Recadrages (x0, y0, x1, y1 en pixels de l'original) : cadrage seulement, aucune modification des pixels.
CROPS = {'p07': (160, 160, 660, 826), 'p02': (215, 70, 810, 863)}

def enhance(im):
    im = ImageOps.exif_transpose(im).convert('RGB')
    im = Image.blend(im, ImageOps.autocontrast(im, cutoff=0.3), 0.5)       # contraste doux
    lum = ImageStat.Stat(im.convert('L')).mean[0]
    if lum < 110:                                                            # tons sombres (ex. photo de nuit)
        g = 0.88 if lum < 90 else 0.94
        lut = [int(255 * ((i / 255) ** g)) for i in range(256)]
        im = im.point(lut * 3)
    return ImageEnhance.Color(im).enhance(1.04)

def lqip(im, w=18):
    t = im.copy(); t.thumbnail((w, w * 2)); t = t.filter(ImageFilter.GaussianBlur(1))
    buf = io.BytesIO(); t.save(buf, 'WEBP', quality=40)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

os.makedirs(OUT, exist_ok=True)
rows, total = [], 0
for pid in sorted(META):
    raw = ImageOps.exif_transpose(Image.open(f'{SRC}/{pid}.jpg'))
    im = enhance(raw.crop(CROPS[pid]) if pid in CROPS else raw)
    w0, h0 = im.size
    widths = sorted({w for w in TARGETS if w < w0} | {w0})                    # jamais au-dessus de la résolution native
    for w in widths:
        h = round(h0 * w / w0)
        r = im.resize((w, h), Image.LANCZOS) if w != w0 else im
        r = r.filter(ImageFilter.UnsharpMask(radius=1.0, percent=45, threshold=2))
        path = f'{OUT}/{pid}-{w}.webp'
        r.save(path, 'WEBP', quality=82, method=6)
        total += os.path.getsize(path)
    alt, pd, pm = META[pid]
    rows.append((pid, w0, h0, widths, alt, pd, pm, lqip(im)))

with open(TS, 'w', encoding='utf-8') as f:
    f.write('// Généré par scripts/process_photos.py — pour changer alt / points focaux, modifier META dans le script puis le relancer.\n')
    f.write('export interface PhotoAsset { src: string; width: number; height: number; widths: number[]; alt: string; focus: string; focusMobile: string; lqip: string }\n\n')
    f.write('export const photos = {\n')
    for pid, w, h, widths, alt, pd, pm, lq in rows:
        f.write(f"  {pid}: {{ src: '/photos/{pid}', width: {w}, height: {h}, widths: {json.dumps(widths)}, alt: {json.dumps(alt, ensure_ascii=False)}, focus: '{pd}', focusMobile: '{pm}', lqip: '{lq}' }},\n")
    f.write('} satisfies Record<string, PhotoAsset>;\n\nexport type PhotoId = keyof typeof photos;\n')
print(f'{len(rows)} photos, {total // 1024} Ko au total')
