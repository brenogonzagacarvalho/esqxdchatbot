const fs = require('fs');
const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfPath) {
  let dataBuffer = fs.readFileSync(pdfPath);
  let data = await pdf(dataBuffer);
  return data.text;
}

function preprocessText(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2')
             .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
             .replace(/([.,!?])([a-zA-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])([.,!?])/g, '$1 $2')
             .replace(/\s+/g, ' ')
             .trim();
}

module.exports = { extractTextFromPDF, preprocessText };