
import re

def check_balance(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple regex to find <div and </div
    # This won't handle JSX comments or strings perfectly, but it's a start.
    div_opens = len(re.findall(r'<div', content))
    div_closes = len(re.findall(r'</div', content))
    
    modal_opens = len(re.findall(r'<Modal', content))
    modal_closes = len(re.findall(r'</Modal', content))

    main_opens = len(re.findall(r'<main', content))
    main_closes = len(re.findall(r'</main', content))

    print(f"Divs: Opens={div_opens}, Closes={div_closes}, Balance={div_opens - div_closes}")
    print(f"Modals: Opens={modal_opens}, Closes={modal_closes}, Balance={modal_opens - modal_closes}")
    print(f"Main: Opens={main_opens}, Closes={main_closes}, Balance={main_opens - main_closes}")

    # To find where the imbalance might be, we can track lines
    stack = []
    lines = content.splitlines()
    for i, line in enumerate(lines):
        line_num = i + 1
        # Find all tags in line
        tags = re.findall(r'<(/?div|/?Modal|/?main)', line)
        for tag in tags:
            if tag.startswith('/'):
                tag_name = tag[1:]
                if not stack:
                    print(f"Error: Closing tag </{tag_name}> on line {line_num} has no matching open tag.")
                else:
                    last_tag, last_line = stack.pop()
                    if last_tag != tag_name:
                        print(f"Error: Tag mismatch. Expected </{last_tag}> (from line {last_line}), but found </{tag_name}> on line {line_num}.")
            else:
                stack.append((tag, line_num))
    
    if stack:
        print("\nRemaining open tags:")
        for tag, line in stack:
            print(f"<{tag}> open on line {line}")

check_balance(r"f:\DOWNLOAD\copy-of-mailflow-pro (2) - Copy\copy-of-mailflow-pro\copy-of-mailflow-pro\copy-of-mailflow-pro\pages\CategoryChatPage.tsx")
