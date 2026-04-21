const fs = require('fs');
const content = fs.readFileSync('pages/Dashboard.tsx', 'utf-8');
const lines = content.split('\n');

let startSurveys = -1;
let endSurveys = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(id: 'surveys')) {
    startSurveys = i - 1; // get the '{'
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes(},)) {
        endSurveys = j;
        break;
      }
    }
    break;
  }
}

if (startSurveys !== -1) {
  const surveyCode = lines.splice(startSurveys, endSurveys - startSurveys + 1);
  let targetIndex = -1;
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(id: 'vouchers')) {
          for(let j = i; j < lines.length; j++) {
              if (lines[j].includes(},)){
                  targetIndex = j + 1;
                  break;
              }
          }
          break;
      }
  }
  if (targetIndex !== -1) {
      lines.splice(targetIndex, 0, ...surveyCode);
      fs.writeFileSync('pages/Dashboard.tsx', lines.join('\n'));
      console.log('Moved surveys successfully');
  } else {
      console.log('vouchers not found');
  }
}
