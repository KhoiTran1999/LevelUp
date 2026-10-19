import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import base64
import io

def remove_checkerboard_and_process():
    input_path = 'logo.jpg'
    img = Image.open(input_path).convert('RGB')
    arr = np.array(img)
    h, w, _ = arr.shape

    # Identify background candidate pixels:
    # Checkerboard squares are neutral (diff between max and min channel is small) and bright (> 220)
    diff = np.max(arr, axis=2).astype(int) - np.min(arr, axis=2).astype(int)
    bright = np.min(arr, axis=2).astype(int)
    
    # Candidate for outer checkerboard: saturation diff < 16 and brightness > 220
    bg_candidate = (diff < 16) & (bright > 220)

    # Flood fill starting from all 4 boundaries so we ONLY remove the external checkerboard
    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        if bg_candidate[0, x]:
            q.append((0, x))
            visited[0, x] = True
        if bg_candidate[h - 1, x]:
            q.append((h - 1, x))
            visited[h - 1, x] = True
    for y in range(h):
        if bg_candidate[y, 0]:
            q.append((y, 0))
            visited[y, 0] = True
        if bg_candidate[y, w - 1]:
            q.append((y, w - 1))
            visited[y, w - 1] = True

    while q:
        y, x = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_candidate[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    # visited is True for outer background
    # Create alpha channel: 0 where visited is True, 255 where hat is
    alpha = np.where(visited, 0, 255).astype(np.uint8)

    # Let's inspect edges: smooth alpha transition to avoid any harsh fringe
    alpha_img = Image.fromarray(alpha, mode='L')
    
    # Smooth the alpha mask slightly for antialiasing
    # Apply small gaussian blur to alpha, but threshold to preserve crisp silhouette
    alpha_blurred = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.7))
    
    # Combine RGB with smoothed alpha
    rgba_img = Image.merge('RGBA', (
        Image.fromarray(arr[:, :, 0]),
        Image.fromarray(arr[:, :, 1]),
        Image.fromarray(arr[:, :, 2]),
        alpha_blurred
    ))

    # Crop to bounding box with comfortable padding
    bbox = rgba_img.getbbox()
    if bbox:
        # Bounding box of the hat
        hat_cropped = rgba_img.crop(bbox)
        # Create square canvas
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        max_dim = max(bw, bh)
        # Add 8% padding
        pad = int(max_dim * 0.08)
        canvas_size = max_dim + 2 * pad
        
        final_logo = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        offset_x = (canvas_size - bw) // 2
        offset_y = (canvas_size - bh) // 2
        final_logo.paste(hat_cropped, (offset_x, offset_y), hat_cropped)
    else:
        final_logo = rgba_img

    # Save master transparent PNG
    os.makedirs('public', exist_ok=True)
    master_png_path = 'public/logo.png'
    final_logo.save(master_png_path, format='PNG', optimize=True)
    print(f"Created {master_png_path} ({final_logo.size[0]}x{final_logo.size[1]})")

    # Generate standard PWA and Web sizes
    sizes = {
        'public/favicon.png': (32, 32),
        'public/icon-192.png': (192, 192),
        'public/apple-touch-icon.png': (180, 180),
        'public/icon-512.png': (512, 512),
        'extension/icons/icon-16.png': (16, 16),
        'extension/icons/icon-48.png': (48, 48),
        'extension/icons/icon-128.png': (128, 128)
    }

    for path, (tw, th) in sizes.items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        resized = final_logo.resize((tw, th), Image.Resampling.LANCZOS)
        resized.save(path, format='PNG', optimize=True)
        print(f"Created {path} ({tw}x{th})")

    # Generate public/logo.svg wrapping high-res 512x512 PNG
    img_512 = final_logo.resize((512, 512), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img_512.save(buf, format='PNG', optimize=True)
    b64_data = base64.b64encode(buf.getvalue()).decode('ascii')
    
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,{b64_data}" width="512" height="512" />
</svg>
'''
    with open('public/logo.svg', 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Created public/logo.svg (embedded high-res PNG vector wrapper)")

if __name__ == '__main__':
    remove_checkerboard_and_process()
