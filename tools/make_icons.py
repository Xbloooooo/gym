# Draws the app icon (a barbell, with the wordmark's vermilion full stop). Run: /usr/bin/python3 tools/make_icons.py
from PIL import Image, ImageDraw
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK, PAPER, ACCENT = (25, 23, 19), (241, 237, 228), (213, 64, 28)
N = 1024
im = Image.new('RGB', (N, N), INK); d = ImageDraw.Draw(im)
cy = 470
def rr(x0, y0, x1, y1, r, fill): d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill)
rr(212, cy - 18, 812, cy + 18, 18, PAPER)                       # bar
for sx in (-1, 1):
    cx = 512 + sx * 178
    rr(cx - 34, cy - 170, cx + 34, cy + 170, 22, PAPER)        # big plate
    cx2 = 512 + sx * 262
    rr(cx2 - 28, cy - 112, cx2 + 28, cy + 112, 20, PAPER)      # small plate
rr(700, 712, 790, 802, 16, ACCENT)                              # the full stop
for size in (512, 192, 180):
    im.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, 'icon-%d.png' % size))
    print('wrote icon-%d.png' % size)
