import os

def find_mojibake(root_dir):
    results = []
    for root, dirs, files in os.walk(root_dir):
        if '.git' in dirs: dirs.remove('.git')
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.next' in dirs: dirs.remove('.next')
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.php', '.html', '.css')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if '\ufffd' in content:
                            results.append(path)
                except Exception:
                    # If it can't be read as utf-8, it might have issues
                    results.append(f"ERR reading: {path}")
    return results

if __name__ == "__main__":
    found = find_mojibake('.')
    for f in found:
        print(f)
