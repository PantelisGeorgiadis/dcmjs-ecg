const dcmjsEcg = require('./../src');
const { DicomEcg } = dcmjsEcg;

const fs = require('fs');

function renderToSvg(dicomFile, svgFile) {
  const fileBuffer = fs.readFileSync(dicomFile);
  const ecg = new DicomEcg(
    fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
  );

  const renderingResult = ecg.render({ applyLowPassFilter: false });
  console.log(renderingResult.info);
  fs.writeFileSync(svgFile, Buffer.from(renderingResult.svg));
}

const args = process.argv.slice(2);
renderToSvg(args[0], args[1]);
