const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/flows/nodes/FlowNodes.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const components = [
    'TriggerNode',
    'ActionNode',
    'RemoveNode',
    'WaitNode',
    'ConditionNode',
    'SplitTestNode',
    'ListActionNode',
    'ZaloZNSNode',
    'AdvancedConditionNode'
];

components.forEach(comp => {
    // Replace export const Comp = ({ ... }) => {
    // with export const Comp = memo(({ ... }) => {
    // Note: React.FC<NodeProps> is included
    
    // We can just find "export const " + comp + ": React.FC<NodeProps> = ({ "
    const searchString = "export const " + comp + ": React.FC<NodeProps> = ({ ";
    if (content.includes(searchString)) {
        content = content.replace(searchString, "export const " + comp + ": React.FC<NodeProps> = memo(({ ");
    } else {
        // Try without trailing space
        const searchRegex = new RegExp("export const " + comp + ": React\\\\.FC<NodeProps> = \\\\(\\\\{");
        content = content.replace(searchRegex, "export const " + comp + ": React.FC<NodeProps> = memo(({");
    }
});

// Now we need to replace the closing }; with }); for each component.
// The file ends with AdvancedConditionNode.
// We can just replace \n};\n with \n});\n for the specific components. 
// Actually, it's safer to find }; at the top level.
// Let's replace all };\n or };\r\n that are at the beginning of a line with });\n.
// wait, since I'm wrapping 9 components, I can just replace \n}; with \n}); 9 times? No, there might be other };.

content = content.replace(/^};\r?$/gm, '});');

fs.writeFileSync(filePath, content, 'utf8');
