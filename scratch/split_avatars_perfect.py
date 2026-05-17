import os
from PIL import Image

src_path = "/Users/patrickhuber/.gemini/antigravity/brain/fa570a6d-d1f8-4820-b7a9-fe851245b6df/media__1779015570645.png"
dest_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/public/avatars"

# Load the image
img = Image.open(src_path)
width, height = img.size

# Since width = 974 and height = 472:
# Each avatar half is 487 wide.
# To make them perfect 472x472 squares:
# Girl (left half): center the 472 width within 0 to 487
girl_left = (487 - 472) // 2
girl_right = girl_left + 472
girl_box = (girl_left, 0, girl_right, height)

# Boy (right half): center the 472 width within 487 to 974
boy_left = 487 + (487 - 472) // 2
boy_right = boy_left + 472
boy_box = (boy_left, 0, boy_right, height)

# Crop and save
girl_img = img.crop(girl_box)
girl_img.save(os.path.join(dest_dir, "kid_girl_ukulele.png"))
print(f"Girl cropped to square {girl_img.size} and saved!")

boy_img = img.crop(boy_box)
boy_img.save(os.path.join(dest_dir, "kid_boy_ukulele.png"))
print(f"Boy cropped to square {boy_img.size} and saved!")
