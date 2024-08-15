const fs = require('fs');
const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfPath) {
  let dataBuffer = fs.readFileSync(pdfPath);
  let data = await pdf(dataBuffer);
  return preprocessText(data.text);
}

function preprocessText(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
             .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
             .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add space between letters and numbers
             .replace(/([.,!?])([a-zA-Z])/g, '$1 $2') // Add space after punctuation
             .replace(/([a-zA-Z])([.,!?])/g, '$1$2') // Remove space before punctuation
             .replace(/([a-zA-Z])([a-zA-Z])/g, '$1$2') // Remove space between consecutive letters
             .replace(/([a-zA-Z])\s([a-zA-Z])/g, '$1$2') // Remove space between consecutive letters
             .replace(/([.,!?])\s([a-zA-Z])/g, '$1 $2') // Add space after punctuation
             .replace(/(\w)\s+(\w)/g, '$1 $2') // Ensure single space between words
             .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
             .replace(/(\w)([.,!?])/g, '$1$2') // Ensure no space before punctuation
             .replace(/([.,!?])(\w)/g, '$1 $2') // Ensure space after punctuation
             .replace(/(\s)([.,!?])/g, '$2') // Remove space before punctuation
             .trim();
}

module.exports = { extractTextFromPDF, preprocessText };