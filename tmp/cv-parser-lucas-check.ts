import fs from 'node:fs';
import PDFParser from 'pdf2json';
import assert from 'node:assert/strict';
import { parseCandidateProfileFromCv } from '../lib/cv-parser';

const path = '/Users/lucasguilhot/Desktop/CV/CV Développeur.pdf';
const buffer = fs.readFileSync(path);

function extract(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, true);
    parser.on('pdfParser_dataReady', () => {
      try {
        resolve(parser.getRawTextContent().trim());
      } catch (error) {
        reject(error);
      } finally {
        parser.destroy();
      }
    });
    parser.on('pdfParser_dataError', (error) => {
      try {
        reject('parserError' in error ? error.parserError : error);
      } finally {
        parser.destroy();
      }
    });
    parser.parseBuffer(buffer);
  });
}

async function main() {
  const rawText = await extract(buffer);
  const profile = parseCandidateProfileFromCv(rawText);

  assert.equal(profile.fullName, 'Lucas GUILHOT');
  assert.equal(profile.role, 'Developpeur full stack');
  assert(profile.technicalSkills.includes('React'));
  assert(profile.technicalSkills.includes('Node.js'));

  console.log(JSON.stringify(profile, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
