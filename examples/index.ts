import { DicomEcg } from './..';

import fs from 'fs';

function renderToSvg(dicomFile: string, svgFile: string) {
  const fileBuffer = fs.readFileSync(dicomFile);
  const ecg = new DicomEcg(
    fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  );

  const renderingResult = ecg.render();
  fs.writeFileSync(svgFile, Buffer.from(renderingResult.svg));
}

const args = process.argv.slice(2);
renderToSvg(args[0], args[1]);
