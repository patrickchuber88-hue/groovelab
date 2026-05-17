import os
from PIL import Image

# Path to the source image uploaded by the user
src_path = "/Users/patrickhuber/.gemini/antigravity/brain/fa570a6d-d1f8-4820-b7a9-fe851245b6df/media__1779015570645.png"
dest_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/public/avatars"

if not os.path.exists(dest_dir):
    os.makedirs(dest_dir)

# Load the image
img = Image.open(src_path)
width, height = img.size

print(f"Original dimensions: {width}x{height}")

# Split down the middle
# The image is two side-by-side square avatars with some black border/background
left_box = (0, 0, width // 2, height)
right_box = (width // 2, 0, width, height)

# Crop left avatar (Girl)
girl_img = img.crop(left_box)
# Let's crop it slightly to remove any black borders on the sides if any,
# but since it's already a square side-by-side, we just save it directly.
girl_img.save(os.path.join(dest_dir, "kid_girl_ukulele.png"))
print("Saved kid_girl_ukulele.png successfully!")

# Crop right avatar (Boy)
boy_img = img.crop(right_box)
boy_img.save(os.path.join(dest_dir, "kid_boy_ukulele.png"))
print("Saved kid_boy_ukulele.png successfully!")
