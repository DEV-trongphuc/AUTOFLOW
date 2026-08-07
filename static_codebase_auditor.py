# d:\GITHUB_SPACE\DOMATION_FULLSTACK\static_codebase_auditor.py
import os
import re
import json
import sys

def safe_print(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        clean_msg = msg.encode(sys.stdout.encoding or 'cp1252', errors='replace').decode(sys.stdout.encoding or 'cp1252')
        print(clean_msg)

def extract_php_strings(content):
    strings = []
    length = len(content)
    i = 0
    while i < length:
        char = content[i]
        
        # Skip single-line comments
        if char == '/' and i + 1 < length and content[i+1] == '/':
            i += 2
            while i < length and content[i] != '\n':
                i += 1
            continue
            
        # Skip multi-line comments
        if char == '/' and i + 1 < length and content[i+1] == '*':
            i += 2
            while i + 1 < length and not (content[i] == '*' and content[i+1] == '/'):
                i += 1
            i += 2
            continue
            
        # Single-quoted string
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
            
        # Double-quoted string
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

def scan_directory(dir_path):
    php_files = []
    for root, dirs, files in os.walk(dir_path):
        if 'vendor' in root or 'PHPMailer' in root or '_dev_archive' in root or '.git' in root or 'node_modules' in root:
            continue
        for file in files:
            if file.endswith('.php'):
                php_files.append(os.path.join(root, file))
    return php_files

def main():
    schema_file = os.path.join(os.path.dirname(__file__), 'db_schema.json')
    if not os.path.exists(schema_file):
        safe_print(f"Error: db_schema.json not found at {schema_file}")
        return
        
    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_data = json.load(f)
        
    schema_map = {}
    for table, columns in schema_data['schema'].items():
        schema_map[table.lower()] = {col['field'].lower(): col for col in columns}
        
    sql_keywords = {
        'select', 'insert', 'update', 'delete', 'from', 'where', 'and', 'or', 'on', 'join', 
        'as', 'left', 'right', 'inner', 'outer', 'order', 'by', 'group', 'limit', 'having', 
        'in', 'null', 'not', 'like', 'is', 'asc', 'desc', 'into', 'set', 'values', 'count', 
        'sum', 'avg', 'min', 'max', 'coalesce', 'ifnull', 'concat', 'date', 'now', 'current_timestamp', 
        'distinct', 'case', 'when', 'then', 'else', 'end', 'exists', 'between', 'union', 'all',
        'true', 'false', 'prepare', 'execute', 'query', 'fetch', 'assoc', 'row', 'stmt', 'offset',
        'using', 'group_concat', 'add', 'alter', 'table', 'column', 'drop', 'index', 'create',
        'json_unquote', 'json_extract', 'json_contains', 'json_keys', 'json_valid', 'find_in_set',
        'rand', 'md5', 'length', 'curdate', 'interval', 'day', 'month', 'year', 'hour', 'minute', 'second'
    }
    
    target_dir = os.path.join(os.path.dirname(__file__), 'api')
    if not os.path.exists(target_dir):
        safe_print(f"Error: api directory not found at {target_dir}")
        return
        
    php_files = scan_directory(target_dir)
    safe_print(f"====================================================")
    safe_print(f"SCANNING {len(php_files)} PHP FILES FOR SQL CONFLICTS (SMART MODE)")
    safe_print(f"====================================================\n")
    
    errors_found = 0
    queries_scanned = 0
    
    table_regex = re.compile(
        r'\b(?:from|join|into|update)\s+([a-zA-Z0-9_]+)(?:\s+(?:as\s+)?([a-zA-Z0-9_]+))?',
        re.IGNORECASE
    )
    column_regex = re.compile(
        r'\b([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\b'
    )
    
    for file_path in php_files:
        rel_path = os.path.relpath(file_path, os.path.dirname(__file__))
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            safe_print(f"Error reading {rel_path}: {e}")
            continue
            
        strings = extract_php_strings(content)
        for val, start_idx in strings:
            trimmed = val.strip()
            if not trimmed:
                continue
                
            first_word = trimmed.split()[0].lower() if trimmed.split() else ''
            if first_word in ['select', 'insert', 'update', 'delete']:
                queries_scanned += 1
                line_num = content[:start_idx].count('\n') + 1
                
                # Normalize SQL
                sql_clean = re.sub(r'\s+', ' ', trimmed)
                
                # SMART PARSING: Strip string literals (text values) to avoid treating them as columns
                sql_clean = re.sub(r"'[^']*'", " ", sql_clean)
                sql_clean = re.sub(r'"[^"]*"', " ", sql_clean)
                
                # Remove backticks
                sql_clean = sql_clean.replace('`', '')
                
                # Extract tables
                tables = {}
                table_matches = table_regex.findall(sql_clean)
                for tbl, alias in table_matches:
                    tbl_lower = tbl.lower()
                    if tbl_lower in sql_keywords:
                        continue
                    
                    alias_lower = alias.lower() if alias else tbl_lower
                    if alias_lower in sql_keywords:
                        alias_lower = tbl_lower
                        
                    tables[alias_lower] = tbl_lower
                    
                if not tables:
                    continue
                    
                tbl_errors = False
                for alias, tbl in tables.items():
                    if tbl not in schema_map:
                        safe_print(f"[MISMATCH] Table '{tbl}' not found in db_schema.json")
                        safe_print(f"   File: {rel_path}:{line_num}")
                        safe_print(f"   SQL:  {trimmed}\n")
                        errors_found += 1
                        tbl_errors = True
                        
                if tbl_errors:
                    continue
                    
                # Extract and validate columns
                col_matches = column_regex.findall(sql_clean)
                checked_cols = set()
                
                for prefix, col in col_matches:
                    pref_lower = prefix.lower()
                    col_lower = col.lower() if col else ''
                    
                    if col_lower:
                        if pref_lower in tables:
                            tbl_name = tables[pref_lower]
                            full_col = f"{tbl_name}.{col_lower}"
                            if full_col not in checked_cols:
                                checked_cols.add(full_col)
                                if col_lower not in schema_map[tbl_name]:
                                    safe_print(f"[MISMATCH] Column '{col_lower}' not found in table '{tbl_name}'")
                                    safe_print(f"   File: {rel_path}:{line_num}")
                                    safe_print(f"   SQL:  {trimmed}\n")
                                    errors_found += 1
                    else:
                        if pref_lower in sql_keywords:
                            continue
                        if pref_lower.isdigit():
                            continue
                        if pref_lower in tables:
                            continue
                            
                        found_in_any = False
                        referenced_tables = list(set(tables.values()))
                        for tbl_name in referenced_tables:
                            if pref_lower in schema_map[tbl_name]:
                                found_in_any = True
                                break
                                
                        if not found_in_any and len(referenced_tables) > 0:
                            if len(referenced_tables) == 1:
                                tbl_name = referenced_tables[0]
                                full_col = f"{tbl_name}.{pref_lower}"
                                if full_col not in checked_cols:
                                    checked_cols.add(full_col)
                                    safe_print(f"[MISMATCH] Column '{pref_lower}' not found in table '{tbl_name}'")
                                    safe_print(f"   File: {rel_path}:{line_num}")
                                    safe_print(f"   SQL:  {trimmed}\n")
                                    errors_found += 1
                                    
    safe_print(f"====================================================")
    safe_print(f"STATIC CODEBASE AUDIT SUMMARY:")
    safe_print(f"   PHP Files Scanned   : {len(php_files)}")
    safe_print(f"   SQL Queries Scanned : {queries_scanned}")
    safe_print(f"   Errors/Mismatches   : {errors_found}")
    safe_print(f"====================================================")
    
if __name__ == '__main__':
    main()
