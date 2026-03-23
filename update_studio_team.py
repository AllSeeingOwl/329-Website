import re

with open("public/Studio Team.html", "r") as f:
    content = f.read()

# Remove hover/focus red styling for brand logo
content = re.sub(r'      \.brand-logo:hover, \.brand-logo:focus-visible \{\n        color: var\(--accent-red\);\n      \}\n\n', '', content)
content = re.sub(r'      \.brand-logo:hover \.quarter-clock, \.brand-logo:focus-visible \.quarter-clock \{\n        border-top-color: var\(--accent-red\);\n        border-left-color: var\(--accent-red\);\n      \}\n\n', '', content)
content = re.sub(r'        transition: border-color 0\.3s ease;\n', '', content)

# Change placeholders
content = content.replace("<h2>Jordan Clarke</h2>", '<h2>Jordan Clarke <span style="font-size: 0.5em; color: #888; font-weight: normal; font-family: \'Inter\', sans-serif;">(Placeholder)</span></h2>')
content = content.replace("<h2>Sam Rivera</h2>", '<h2>Sam Rivera <span style="font-size: 0.5em; color: #888; font-weight: normal; font-family: \'Inter\', sans-serif;">(Placeholder)</span></h2>')
content = content.replace("<h2>Alex Chen</h2>", '<h2>Alex Chen <span style="font-size: 0.5em; color: #888; font-weight: normal; font-family: \'Inter\', sans-serif;">(Placeholder)</span></h2>')

content = content.replace('<div class="role">Creative Director, Illustration</div>', '<div class="role">Creative Director, Illustration (Placeholder)</div>')
content = content.replace('<div class="role">Lead Puzzlesmith, Narrative</div>', '<div class="role">Lead Puzzlesmith, Narrative (Placeholder)</div>')
content = content.replace('<div class="role">Operations & Production</div>', '<div class="role">Operations & Production (Placeholder)</div>')

with open("public/Studio Team.html", "w") as f:
    f.write(content)
