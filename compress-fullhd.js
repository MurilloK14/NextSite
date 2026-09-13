const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const INPUT_DIR  = path.join(__dirname, 'animacao_original');
const OUTPUT_DIR = path.join(__dirname, 'animacao');
const QUALITY    = 90;
const WIDTH      = 1920;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter(f => f.match(/\.(webp|jpg|jpeg|png)$/i));

if (files.length === 0) {
  console.log('Nenhum arquivo encontrado em animacao_original.');
  process.exit(0);
}

const sorted = files.sort((a, b) => parseInt(a.match(/\d+/) ? a.match(/\d+/)[0] : 0) - parseInt(b.match(/\d+/) ? b.match(/\d+/)[0] : 0));

console.log('Processando ' + sorted.length + ' frames em Full HD (' + WIDTH + 'px, Qualidade ' + QUALITY + ')...');

let done = 0;
const BATCH = 8;

async function processFile(file, idx) {
  const inp = path.join(INPUT_DIR, file);
  // Ensure the output is strictly ezgif-frame-001 format
  const outName = 'ezgif-frame-' + String(idx + 1).padStart(3, '0') + '.webp';
  const out = path.join(OUTPUT_DIR, outName);
  
  await sharp(inp)
    .resize(WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(out);
    
  done++;
  if (done % 20 === 0 || done === sorted.length) {
    console.log('[' + Math.round(done/sorted.length*100) + '%] ' + done + '/' + sorted.length);
  }
}

(async () => {
  for (let i = 0; i < sorted.length; i += BATCH) {
    const batch = sorted.slice(i, i + BATCH);
    const promises = batch.map((file, localIdx) => processFile(file, i + localIdx));
    await Promise.all(promises);
  }
  console.log('Finalizado! Frames otimizados para Full HD prontos na pasta animacao.');
})();
