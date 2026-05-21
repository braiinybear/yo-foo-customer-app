import os
from PIL import Image, ImageChops

def trim(im):
    # Find bounding box of non-transparent pixels
    bg = Image.new(im.mode, im.size, (0,0,0,0))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

def generate_perfect_icon(master_logo_path, output_path, canvas_size=(1024, 1024), scale_percent=0.55):
    print(f"Processing: {master_logo_path} -> {output_path}")
    
    # 1. Open master logo
    im = Image.open(master_logo_path).convert("RGBA")
    
    # 2. Trim excess transparent margins to get pure logo bounds
    trimmed_im = trim(im)
    
    # 3. Create transparent canvas
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    
    # 4. Calculate dimensions maintaining aspect ratio
    orig_w, orig_h = trimmed_im.size
    max_dim = max(orig_w, orig_h)
    
    target_max_dim = int(min(canvas_size) * scale_percent)
    
    # Determine scale factor
    scale_factor = target_max_dim / max_dim
    new_w = int(orig_w * scale_factor)
    new_h = int(orig_h * scale_factor)
    
    # Resize logo
    resized_im = trimmed_im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # 5. Paste resized logo perfectly centered
    paste_x = (canvas_size[0] - new_w) // 2
    paste_y = (canvas_size[1] - new_h) // 2
    
    canvas.paste(resized_im, (paste_x, paste_y), resized_im)
    
    # 6. Save image
    canvas.save(output_path, "PNG")
    print(f"[SUCCESS] Saved perfectly scaled icon to {output_path} (scale: {scale_percent*100}%)")

def main():
    base_dir = "c:\\My Projects\\Mobile Development\\BraiinyFoodApps\\yo-foo-customer-app"
    assets_dir = os.path.join(base_dir, "assets", "images")
    
    master_logo = os.path.join(assets_dir, "app-logo.png")
    
    if not os.path.exists(master_logo):
        print(f"Error: Master logo not found at {master_logo}")
        return
        
    # Generate Android Adaptive Icon Foreground (requires largest padding: 50% - 55% scale)
    android_fg = os.path.join(assets_dir, "android-icon-foreground.png")
    generate_perfect_icon(master_logo, android_fg, scale_percent=0.55)
    
    # Generate iOS & General Launcher Icon (requires moderate padding: 68% - 70% scale)
    ios_icon = os.path.join(assets_dir, "icon.png")
    generate_perfect_icon(master_logo, ios_icon, scale_percent=0.70)
    
    # Generate Web Favicon (80% scale)
    favicon = os.path.join(assets_dir, "favicon.png")
    generate_perfect_icon(master_logo, favicon, scale_percent=0.80)

if __name__ == "__main__":
    main()
