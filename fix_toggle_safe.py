"""
Binary-safe fix: replace invalid Tailwind h-4.5 class in EmailProperties.tsx
WITHOUT touching any non-ASCII Vietnamese text bytes.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = 'components/templates/EmailEditor/EmailProperties.tsx'

with open(path, 'rb') as f:
    raw = f.read()

# The content-[''] in Tailwind is literally: after:content-['']
# In bytes (ascii-safe): b"after:content-['']"
OLD_TOGGLE = (
    b"w-9 h-4.5 bg-slate-200 rounded-full peer "
    b"peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/20 "
    b"peer-checked:bg-amber-600 transition-colors shadow-inner "
    b"after:content-[''] after:absolute after:top-[2px] after:left-[2px] "
    b"after:bg-white after:shadow-sm after:border-slate-300 after:border "
    b"after:rounded-full after:h-3.5 after:w-3.5 after:transition-all "
    b"peer-checked:after:translate-x-[18px] peer-checked:after:border-white"
)

NEW_TOGGLE = (
    b"w-9 h-5 bg-slate-200 rounded-full peer "
    b"peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/20 "
    b"peer-checked:bg-amber-600 transition-colors shadow-inner "
    b"after:content-[''] after:absolute after:top-[2px] after:left-[2px] "
    b"after:bg-white after:shadow-sm after:border-slate-300 after:border "
    b"after:rounded-full after:h-4 after:w-4 after:transition-all "
    b"peer-checked:after:translate-x-4 after:border-white"
)

count = raw.count(OLD_TOGGLE)
print(f"Found {count} occurrences of h-4.5 toggle")

if count == 0:
    print("Nothing to replace — checking what's in the file...")
    # Try to find partial match
    partial = b"h-4.5 bg-slate-200"
    pc = raw.count(partial)
    print(f"Partial match 'h-4.5 bg-slate-200': {pc} occurrences")
    # Also check if already fixed
    already = raw.count(b"h-5 bg-slate-200")
    print(f"Already has 'h-5 bg-slate-200': {already} occurrences")
else:
    fixed = raw.replace(OLD_TOGGLE, NEW_TOGGLE)
    with open(path, 'wb') as f:
        f.write(fixed)
    print("Done — binary-safe, Vietnamese text untouched.")
