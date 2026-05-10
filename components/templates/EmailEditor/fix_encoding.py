"""
Fix: File was read as UTF-8 but original was likely saved as UTF-8 with incorrect re-encoding.
The Vietnamese text got double-encoded: original UTF-8 bytes were read as Latin-1, then written as UTF-8.
Fix: read the current (broken) file as latin-1, then encode as utf-8 properly.
"""

path = 'EmailProperties.tsx'

# Read the corrupted file as latin-1 (which reverses the double-encoding)
with open(path, 'r', encoding='latin-1') as f:
    content = f.read()

# Verify fix worked by checking a known corrupted string
sample = 'TiÃªu Ä'
if sample in content:
    print("Detected double-encoded UTF-8. Fixing...")
    # Re-encode: latin-1 bytes -> utf-8 string
    content_bytes = content.encode('latin-1')
    content_fixed = content_bytes.decode('utf-8')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content_fixed)
    print("Fixed! File restored to proper UTF-8.")
else:
    print("No corruption detected or different issue.")
    print("Sample check string not found.")
