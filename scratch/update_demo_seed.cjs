const fs = require('fs');

const data = JSON.parse(fs.readFileSync('seed_data_v6.json', 'utf-8'));

let content = `// AUTO-GENERATED MASSIVE DEMO SEED DATA
export const seedDemoData = () => {
    const set = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));
`;

for (const [key, value] of Object.entries(data)) {
    content += `    set('${key}', ${JSON.stringify(value)});\n`;
}

content += `};\n`;

fs.writeFileSync('utils/demoSeed.ts', content);
console.log('Successfully updated utils/demoSeed.ts');
