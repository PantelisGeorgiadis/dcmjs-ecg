const DicomEcg = require('./DicomEcg');
const log = require('./log');
const version = require('./version');

const DcmjsEcg = {
  DicomEcg,
  log,
  version,
};

//#region Exports
module.exports = DcmjsEcg;
//#endregion
