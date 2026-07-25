# d:\GITHUB_SPACE\DOMATION_FULLSTACK\find_actual_mismatches.py
import os
import re
import json

def scan_directory(dir_path):
    php_files = []
    for root, dirs, files in os.walk(dir_path):
        if 'vendor' in root or 'PHPMailer' in root or '_dev_archive' in root or '.git' in root or 'node_modules' in root:
            continue
        for file in files:
            if file.endswith('.php'):
                php_files.append(os.path.join(root, file))
    return php_files

def extract_php_strings(content):
    strings = []
    length = len(content)
    i = 0
    while i < length:
        char = content[i]
        if char == '/' and i + 1 < length and content[i+1] == '/':
            i += 2
            while i < length and content[i] != '\n':
                i += 1
            continue
        if char == '/' and i + 1 < length and content[i+1] == '*':
            i += 2
            while i + 1 < length and not (content[i] == '*' and content[i+1] == '/'):
                i += 1
            i += 2
            continue
        if char == "'":
            start_idx = i
            i += 1
            str_val = []
            while i < length:
                if content[i] == '\\' and i + 1 < length:
                    str_val.append(content[i:i+2])
                    i += 2
                elif content[i] == "'":
                    i += 1
                    break
                else:
                    str_val.append(content[i])
                    i += 1
            strings.append((''.join(str_val), start_idx))
            continue
        if char == '"':
            start_idx = i
            i += 1
            str_val = []
            while i < length:
                if content[i] == '\\' and i + 1 < length:
                    str_val.append(content[i:i+2])
                    i += 2
                elif content[i] == '"':
                    i += 1
                    break
                else:
                    str_val.append(content[i])
                    i += 1
            strings.append((''.join(str_val), start_idx))
            continue
        i += 1
    return strings

def main():
    schema_file = 'db_schema.json'
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_data = json.load(f)
        
    schema_map = {}
    for table, columns in schema_data['schema'].items():
        schema_map[table.lower()] = {col['field'].lower(): col for col in columns}
        
    sql_functions = {
        'if', 'date_sub', 'date_add', 'json_table', 'json_extract', 'json_unquote', 'json_contains',
        'json_keys', 'json_valid', 'find_in_set', 'rand', 'md5', 'length', 'curdate', 'now', 'coalesce',
        'ifnull', 'concat', 'count', 'sum', 'avg', 'min', 'max', 'date', 'current_timestamp', 'distinct',
        'exists', 'between', 'union', 'all', 'group_concat', 'unix_timestamp', 'str_to_date', 'date_format',
        'lower', 'upper', 'trim', 'replace', 'round', 'floor', 'ceil', 'abs', 'interval', 'day', 'month', 'year',
        'hour', 'minute', 'second', 'isnull', 'values', 'ignore', 'as', 'on', 'where', 'and', 'or', 'not', 'in',
        'like', 'is', 'null', 'true', 'false', 'join', 'left', 'right', 'inner', 'outer', 'select', 'insert',
        'update', 'delete', 'from', 'into', 'set', 'order', 'by', 'group', 'limit', 'having', 'offset', 'desc', 'asc',
        'case', 'when', 'then', 'else', 'end', 'char_length', 'coalesce', 'nullif', 'lpad', 'rpad', 'substring'
    }
    
    php_files = scan_directory('api')
    
    table_regex = re.compile(
        r'\b(?:from|join|into|update)\s+([a-zA-Z0-9_]+)(?:\s+(?:as\s+)?([a-zA-Z0-9_]+))?',
        re.IGNORECASE
    )
    
    actual_errors = 0
    mismatch_lines = []
    
    for file_path in php_files:
        rel_path = os.path.relpath(file_path)
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        strings = extract_php_strings(content)
        for val, start_idx in strings:
            trimmed = val.strip()
            if not trimmed:
                continue
                
            first_word = trimmed.split()[0].lower() if trimmed.split() else ''
            if first_word in ['select', 'insert', 'update', 'delete']:
                line_num = content[:start_idx].count('\n') + 1
                
                # Normalize query
                sql_clean = re.sub(r'\s+', ' ', trimmed)
                
                # Strip string literals
                sql_clean_no_quotes = re.sub(r"'[^']*'", " ", sql_clean)
                sql_clean_no_quotes = re.sub(r'"[^"]*"', " ", sql_clean_no_quotes)
                sql_clean_no_quotes = sql_clean_no_quotes.replace('`', '')
                
                # Extract and ignore column/table aliases in this query
                ignored_aliases = set()
                # 1. Alias preceded by AS: e.g. "COUNT(*) as total"
                as_matches = re.findall(r'\bas\s+([a-zA-Z0-9_]+)\b', sql_clean_no_quotes, re.IGNORECASE)
                for m in as_matches:
                    ignored_aliases.add(m.lower())
                # 2. Subquery alias: e.g. ") first_pvs"
                sub_matches = re.findall(r'\)\s*(?:as\s+)?([a-zA-Z0-9_]+)\b', sql_clean_no_quotes, re.IGNORECASE)
                for m in sub_matches:
                    ignored_aliases.add(m.lower())
                
                # Extract tables
                tables = {}
                table_matches = table_regex.findall(sql_clean_no_quotes)
                for tbl, alias in table_matches:
                    tbl_lower = tbl.lower()
                    if tbl_lower in sql_functions or tbl_lower in ignored_aliases:
                        continue
                    tbl_idx = trimmed.lower().find(tbl_lower)
                    if tbl_idx > 0 and trimmed[tbl_idx - 1] == '$':
                        continue
                        
                    alias_lower = alias.lower() if alias else tbl_lower
                    if alias_lower in sql_functions or alias_lower in ignored_aliases:
                        alias_lower = tbl_lower
                    tables[alias_lower] = tbl_lower
                    
                if not tables:
                    continue
                    
                # Validate tables
                for alias, tbl in tables.items():
                    if tbl not in schema_map:
                        if not tbl.startswith('$') and not tbl.startswith('?'):
                            mismatch_lines.append(f"[TABLE MISMATCH] Table '{tbl}' not found in database schema!")
                            mismatch_lines.append(f"   File: {rel_path}:{line_num}")
                            mismatch_lines.append(f"   SQL:  {trimmed}\n")
                            actual_errors += 1
                            
                # Validate columns
                words = re.findall(r'\b[a-zA-Z0-9_]+\b', sql_clean_no_quotes)
                for word in words:
                    word_lower = word.lower()
                    if word_lower in sql_functions or word_lower in ignored_aliases:
                        continue
                    if word_lower.isdigit():
                        continue
                    if word_lower in tables:
                        continue
                        
                    word_idx = trimmed.lower().find(word_lower)
                    if word_idx > 0 and trimmed[word_idx - 1] == '$':
                        continue
                        
                    found = False
                    ref_tables = list(set(tables.values()))
                    for tbl_name in ref_tables:
                        if tbl_name in schema_map:
                            if word_lower in schema_map[tbl_name]:
                                found = True
                                break
                                
                    if not found and len(ref_tables) > 0:
                        if len(ref_tables) == 1:
                            tbl_name = ref_tables[0]
                            if tbl_name in schema_map:
                                mismatch_lines.append(f"[COLUMN MISMATCH] Column '{word_lower}' not found in table '{tbl_name}'!")
                                mismatch_lines.append(f"   File: {rel_path}:{line_num}")
                                mismatch_lines.append(f"   SQL:  {trimmed}\n")
                                actual_errors += 1

    with open('mismatches.txt', 'w', encoding='utf-8') as f_out:
        f_out.write(f"Analyzed {len(php_files)} PHP files for actual mismatches.\n")
        f_out.write(f"Found {actual_errors} potential errors.\n\n")
        f_out.write('\n'.join(mismatch_lines))
        
    print(f"Audit complete. Found {actual_errors} potential mismatches. Results saved to mismatches.txt")

if __name__ == '__main__':
    main()
