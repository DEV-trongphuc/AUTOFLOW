import re

with open(r'e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

def get_cols(name):
    pattern = 'CREATE TABLE `' + name + '` \\((.*?)\\) ENGINE='
    m = re.search(pattern, sql, re.DOTALL)
    if not m: return []
    return re.findall(r'`(\w+)` \w', m.group(1))

for t in ['short_links','voucher_claims','flow_enrollments','subscriber_flow_states','survey_answer_details','subscriber_lists','list_subscribers']:
    print(t+':', get_cols(t))
