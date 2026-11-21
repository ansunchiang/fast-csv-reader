import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './solve.js';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8'));
const answers = [];
for (const { input } of cases) answers.push(run(input));
writeFileSync(join(outputDir, 'answers.json'), JSON.stringify(answers));
