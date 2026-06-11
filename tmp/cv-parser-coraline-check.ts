import fs from 'node:fs';
import PDFParser from 'pdf2json';
import assert from 'node:assert/strict';
import { parseCandidateProfileFromCv } from '../lib/cv-parser';

const path = '/Users/lucasguilhot/Downloads/CV_Coraline-TICOU-Alternance.VF.pdf';
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

  assert.equal(profile.role, "Charge d'affaires");
  assert.equal(profile.fullName, 'Coraline TICOU');
  assert(!profile.preferredKeywords.includes('pour mes proches.'));
  assert(!profile.preferredKeywords.includes("Centres d'intérêts :"));
  assert(!profile.preferredKeywords.includes('Français - langue maternelle'));

  console.log(JSON.stringify(profile, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
