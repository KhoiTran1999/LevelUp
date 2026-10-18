"""
Generate crisp PNG icons for LevelUp Chrome Extension (Focus Shield).
Outputs: icons/icon-16.png, icons/icon-48.png, icons/icon-128.png
"""
import os
import math
from PIL import Image, ImageDraw

def generate_icon(size):
    # Create RGBA image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Coordinates and margins
    m = max(1, size // 16)
    w = size - 2 * m
    h = size - 2 * m
    cx = size / 2.0
    cy = size / 2.0
    
    # Shield shape points
    # Top edge: rounded or straight, side edges go down then converge to bottom point
    top_y = m + size * 0.05
    mid_y = m + h * 0.55
    bot_y = size - m - size * 0.05
    left_x = m + size * 0.08
    right_x = size - m - size * 0.08
    
    shield_pts = [
        (cx, top_y),
        (right_x, top_y + size * 0.1),
        (right_x, mid_y),
        (cx, bot_y),
        (left_x, mid_y),
        (left_x, top_y + size * 0.1),
    ]
    
    # Draw Shield background (Deep Indigo / Violet gradient simulation)
    draw.polygon(shield_pts, fill='#4338CA') # Indigo-700
    
    # Draw Inner Shield (Brighter Indigo / Purple)
    inner_inset = max(1.0, size * 0.08)
    inner_pts = [
        (cx, top_y + inner_inset),
        (right_x - inner_inset, top_y + size * 0.1 + inner_inset * 0.7),
        (right_x - inner_inset, mid_y - inner_inset * 0.3),
        (cx, bot_y - inner_inset * 1.2),
        (left_x + inner_inset, mid_y - inner_inset * 0.3),
        (left_x + inner_inset, top_y + size * 0.1 + inner_inset * 0.7),
    ]
    draw.polygon(inner_pts, fill='#6366F1') # Indigo-500
    
    # Gold border highlight
    outline_color = '#F59E0B' # Amber-500 gold
    draw.polygon(shield_pts, outline=outline_color, width=max(1, size // 16))
    
    # Central Sword / Lightning emblem (Gold / White)
    if size >= 48:
        # Draw central sword blade and guard
        sword_color = '#FEF08A' # Yellow-200
        guard_color = '#F59E0B' # Amber-500
        
        # Blade vertical line / polygon
        bw = max(2, size // 14)
        sword_top = top_y + size * 0.18
        sword_bot = bot_y - size * 0.22
        draw.line([(cx, sword_top), (cx, sword_bot)], fill=sword_color, width=bw)
        
        # Sword crossguard
        gw = size * 0.28
        gy = sword_top + size * 0.15
        draw.line([(cx - gw/2, gy), (cx + gw/2, gy)], fill=guard_color, width=max(2, size // 14))
        
        # Sword pommel
        draw.ellipse([(cx - bw, sword_top - bw/2), (cx + bw, sword_top + bw/2)], fill=guard_color)
    else:
        # 16x16: Simplified sharp golden crest
        draw.line([(cx, top_y + size*0.25), (cx, bot_y - size*0.25)], fill='#FEF08A', width=2)
        draw.line([(cx - 2, cy - 1), (cx + 2, cy - 1)], fill='#F59E0B', width=2)
        
    return img

def main():
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    for s in [16, 48, 128]:
        out_path = os.path.join(icons_dir, f'icon-{s}.png')
        icon_img = generate_icon(s)
        icon_img.save(out_path, format='PNG')
        print(f"Successfully generated {out_path} ({s}x{s}px)")

if __name__ == '__main__':
    main()
