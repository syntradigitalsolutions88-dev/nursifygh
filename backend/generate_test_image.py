from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (1200, 1600), 'white')
draw = ImageDraw.Draw(img)

try:
    font = ImageFont.truetype('arial.ttf', 22)
    title_font = ImageFont.truetype('arialbd.ttf', 28)
except Exception:
    font = ImageFont.load_default()
    title_font = ImageFont.load_default()

y = 40
draw.text((40, y), 'NMC LICENSURE EXAMINATION - GENERAL PAPER', fill='black', font=title_font)
y += 50
draw.text((40, y), '2023 PAST QUESTIONS', fill='black', font=title_font)
y += 60

questions = [
    ('28. The client has just had surgery to create an ileostomy. The nurse assesses the client in the',
     'immediate post-operative period for which of the following most frequent complication of this',
     'type of surgery?',
     ['A. Fluid and electrolyte imbalance', 'B. Infection at the stoma site', 'C. Obstruction of the stoma', 'D. Skin irritation around the stoma']),
    ('30. Administration of which vaccine causes formation of a permanent scar at the site of injection?',
     '', '',
     ['A. Polio vaccine', 'B. BCG vaccine', 'C. Measles vaccine', 'D. Hepatitis B vaccine']),
    ('34. A common deficiency of nicotinic acid is:',
     '', '',
     ['A. Scurvy', 'B. Beri-beri', 'C. Pellagra', 'D. Rickets']),
    ('35. Pot belly is a major feature of which condition?',
     '', '',
     ['A. Marasmus', 'B. Kwashiorkor', 'C. Scurvy', 'D. Rickets']),
    ('37. A system whereby health resources are distributed to only one geographical area is called:',
     '', '',
     ['A. Regionalization', 'B. Centralization', 'C. Decentralization', 'D. Privatization']),
    ('41. Which of the following shortcut keys is used to copy a file?',
     '', '',
     ['A. Ctrl + X', 'B. Ctrl + C', 'C. Ctrl + V', 'D. Ctrl + Z']),
]

for q1, q2, q3, opts in questions:
    draw.text((40, y), q1, fill='black', font=font); y += 32
    if q2:
        draw.text((40, y), q2, fill='black', font=font); y += 32
    if q3:
        draw.text((40, y), q3, fill='black', font=font); y += 32
    for opt in opts:
        draw.text((60, y), opt, fill='black', font=font); y += 30
    y += 20

out = r'C:\Users\LENOVO\Desktop\past_paper.jpg'
img.save(out, 'JPEG', quality=95)
print('SUCCESS: Image saved to', out)
