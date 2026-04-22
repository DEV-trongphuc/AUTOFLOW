import os
import re

api_dir = r"e:\AUTOFLOW\AUTOMATION_FLOW\api"

cors_patterns = [
    re.compile(r'header\(\s*[\'"]Access-Control-Allow-Origin:\s*\*[\'"]\s*\);', re.IGNORECASE),
    re.compile(r'header\(\s*[\'"]Access-Control-Allow-Methods:[^\'"]+[\'"]\s*\);', re.IGNORECASE),
    re.compile(r'header\(\s*[\'"]Access-Control-Allow-Headers:[^\'"]+[\'"]\s*\);', re.IGNORECASE),
    re.compile(r'if\s*\(\$_SERVER\[[\'"]REQUEST_METHOD[\'"]\]\s*===\s*[\'"]OPTIONS[\'"]\)\s*\{\s*http_response_code\(200\);\s*exit\(\)?;\s*\}', re.IGNORECASE | re.DOTALL),
    re.compile(r'if\s*\(\$_SERVER\[[\'"]REQUEST_METHOD[\'"]\]\s*===\s*[\'"]OPTIONS[\'"]\)\s*\{\s*exit\(0\);\s*\}', re.IGNORECASE | re.DOTALL)
]

modified_files = []

for filename in os.listdir(api_dir):
    if not filename.endswith('.php'):
        continue
    filepath = os.path.join(api_dir, filename)
    with open(filepath, 'r', encoding='utf-8', errors='surrogateescape') as f:
        content = f.read()
        
    # Check if db_connect.php or bootstrap.php is included
    if 'db_connect.php' not in content and 'bootstrap.php' not in content:
        continue
        
    original_content = content
    for pattern in cors_patterns:
        content = pattern.sub('', content)
        
    # Clean up multiple empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8', errors='surrogateescape') as f:
            f.write(content)
        modified_files.append(filename)

print("Modified files:", modified_files)
