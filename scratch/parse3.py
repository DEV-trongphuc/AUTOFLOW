import re

with open(r'e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

def get_cols(name):
    pattern = 'CREATE TABLE `' + name + '` \\((.*?)\\) ENGINE='
    m = re.search(pattern, sql, re.DOTALL)
    if not m: return None
    return re.findall(r'`(\w+)` \w', m.group(1))

targets = [
    'campaigns', 'campaign_reminders', 'mail_delivery_logs',
    'subscriber_activity', 'flow_enrollments', 'flow_event_queue',
    'forms', 'flow_snapshots', 'lists', 'templates',
    'subscribers', 'tags', 'segments'
]
for t in targets:
    cols = get_cols(t)
    if cols:
        print(f'{t}: {cols}')
    else:
        print(f'{t}: NOT FOUND')
