# d:\GITHUB_SPACE\DOMATION_FULLSTACK\analyze_mismatches.py
import re
import json

def main():
    with open('mismatches.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    with open('db_schema.json', 'r', encoding='utf-8') as f_schema:
        schema = json.load(f_schema)['schema']
        
    table_mismatches = []
    column_mismatches = {}
    
    current_error = None
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip:
            continue
            
        if line_strip.startswith('[TABLE MISMATCH]'):
            match = re.search(r"Table '([a-zA-Z0-9_]+)' not found", line_strip)
            if match:
                table_name = match.group(1)
                current_error = ('table', table_name)
        elif line_strip.startswith('[COLUMN MISMATCH]'):
            match = re.search(r"Column '([a-zA-Z0-9_]+)' not found in table '([a-zA-Z0-9_]+)'", line_strip)
            if match:
                col_name = match.group(1)
                tbl_name = match.group(2)
                current_error = ('column', tbl_name, col_name)
        elif line_strip.startswith('File:'):
            if current_error:
                file_info = line_strip.split('File:')[1].strip()
                if current_error[0] == 'table':
                    table_mismatches.append({
                        'table': current_error[1],
                        'file': file_info
                    })
                elif current_error[0] == 'column':
                    tbl = current_error[1]
                    col = current_error[2]
                    if tbl not in column_mismatches:
                        column_mismatches[tbl] = []
                    column_mismatches[tbl].append({
                        'column': col,
                        'file': file_info
                    })
                current_error = None

    # Print Table Mismatches
    print("=== TABLE MISMATCHES ===")
    unique_tables = {}
    for tm in table_mismatches:
        tbl = tm['table']
        if tbl not in unique_tables:
            unique_tables[tbl] = []
        unique_tables[tbl].append(tm['file'])
        
    for tbl, files in unique_tables.items():
        print(f"Table: {tbl} (Found in {len(files)} places)")
        for file in list(set(files))[:5]: # Show top 5 files
            print(f"  - {file}")
            
    print("\n=== COLUMN MISMATCHES ===")
    for tbl, cols in column_mismatches.items():
        unique_cols = {}
        for c in cols:
            col = c['column']
            if col not in unique_cols:
                unique_cols[col] = []
            unique_cols[col].append(c['file'])
            
        print(f"Table: {tbl}")
        for col, files in unique_cols.items():
            # Filter out common SQL functions/keywords that are false positives
            if col in ['if', 'case', 'when', 'else', 'end', 'sum', 'count', 'avg', 'min', 'max', 'date', 'char_length']:
                continue
            print(f"  Column: {col} (Found in {len(files)} places)")
            for file in list(set(files))[:3]:
                print(f"    - {file}")

if __name__ == '__main__':
    main()
