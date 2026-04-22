import re, sys

with open(r'e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# find all CREATE TABLE names
tables = re.findall(r'CREATE TABLE `(\w+)`', sql)
print(f'Total tables: {len(tables)}')
print(sorted(tables))

# Extract columns per table
def get_cols(table_name):
    pat = r'CREATE TABLE `' + table_name + r'` \((.*?)\) ENGINE='
    m = re.search(pat, sql, re.DOTALL)
    if not m:
        return []
    body = m.group(1)
    cols = re.findall(r'`(\w+)` \w', body)
    return cols

key_tables = [
    'flows','flow_steps','subscriber_flow_states',
    'surveys','survey_questions','survey_responses','survey_answers','survey_blocks',
    'voucher_campaigns','voucher_codes',
    'links','link_clicks',
    'web_visitors','web_sessions','web_page_views','web_events','web_properties',
    'queue_throttle','queue_jobs'
]

print()
for t in key_tables:
    cols = get_cols(t)
    found = t in tables
    print(f'[{"OK" if found else "MISSING"}] {t}: {cols}')
