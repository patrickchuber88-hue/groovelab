import os
from PIL import Image

def compress_pngs():
    directory = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/public/avatars"
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return

    files = [f for f in os.listdir(directory) if f.lower().endswith('.png')]
    print(f"Found {len(files)} PNG files in {directory}")

    count = 0
    total_saved = 0

    for filename in files:
        filepath = os.path.join(directory, filename)
        orig_size = os.path.getsize(filepath)
        
        try:
            with Image.open(filepath) as img:
                # Resize if larger than 400px on any side
                max_size = 400
                if img.width > max_size or img.height > max_size:
                    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
                # Save back optimized
                img.save(filepath, "PNG", optimize=True)
                
            new_size = os.path.getsize(filepath)
            saved = orig_size - new_size
            total_saved += saved
            count += 1
            print(f"Compressed {filename}: {orig_size/1024:.1f}KB -> {new_size/1024:.1f}KB (Saved {saved/1024:.1f}KB)")
        except Exception as e:
            print(f"Error compressing {filename}: {e}")

    # Also check root public files (like dynamic group avatars)
    public_root = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/public"
    root_files = [f for f in os.listdir(public_root) if f.lower().endswith('.png') and ('band_avatar' in f or 'campus_login' in f or 'logo' in f)]
    for filename in root_files:
        filepath = os.path.join(public_root, filename)
        orig_size = os.path.getsize(filepath)
        try:
            with Image.open(filepath) as img:
                max_size = 400
                if 'campus_login' in filename or 'logo' in filename:
                    # Skip resizing login hero or logo to keep high res, just optimize
                    img.save(filepath, "PNG", optimize=True)
                else:
                    if img.width > max_size or img.height > max_size:
                        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                    img.save(filepath, "PNG", optimize=True)
            new_size = os.path.getsize(filepath)
            saved = orig_size - new_size
            total_saved += saved
            count += 1
            print(f"Compressed root {filename}: {orig_size/1024:.1f}KB -> {new_size/1024:.1f}KB (Saved {saved/1024:.1f}KB)")
        except Exception as e:
            print(f"Error compressing root {filename}: {e}")

    print(f"\nDone! Optimized {count} files. Total space saved: {total_saved/(1024*1024):.1f}MB")

if __name__ == "__main__":
    compress_pngs()
