const DicomEcg = require('./../src/DicomEcg');

const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const chai = require('chai');
const expect = chai.expect;

const PN_COMPONENT_DELIMITER = 0x3d;
const VM_DELIMITER = 0x5c;

function pnObjectToString(value) {
  if (typeof value === 'string' || value instanceof String) {
    return value;
  }

  const pnDelim = String.fromCharCode(PN_COMPONENT_DELIMITER);
  if (!Array.isArray(value)) {
    value = [value];
  }
  return value
    .filter(Boolean)
    .map(function (v) {
      if (v === undefined || typeof v === 'string' || v instanceof String) {
        return v;
      }
      return [v.Alphabetic ?? '', v.Ideographic ?? '', v.Phonetic ?? '']
        .join(pnDelim)
        .replace(new RegExp(`${pnDelim}*$`), '');
    })
    .join(String.fromCharCode(VM_DELIMITER));
}

describe('DicomEcg', () => {
  it('should correctly convert elements to a DicomEcg and back', () => {
    const patientName = 'JOHN^DOE';
    const patientId = '123456';
    const modality = 'ECG';

    const ecg1 = new DicomEcg(
      {
        PatientName: patientName,
        PatientID: patientId,
        Modality: modality,
      },
      '1.2.840.10008.1.2'
    );
    ecg1.setElement('Manufacturer', 'Unknown');
    ecg1.setElement('ManufacturerModelName', 'UnknownModel');
    const dicomEcg1 = ecg1.getDenaturalizedDataset();

    const image2 = new DicomEcg(dicomEcg1, '1.2.840.10008.1.2');
    expect(pnObjectToString(image2.getElement('PatientName'))).to.be.eq(patientName);
    expect(image2.getElement('PatientID')).to.be.eq(patientId);
    expect(image2.getElement('Modality')).to.be.eq(modality);
    expect(image2.getElement('Manufacturer')).to.be.eq('Unknown');
    expect(image2.getElement('ManufacturerModelName')).to.be.eq('UnknownModel');
    expect(image2.getTransferSyntaxUid()).to.be.eq('1.2.840.10008.1.2');
  });

  it('should throw for invalid SOP class UID', () => {
    expect(() => {
      const ecg = new DicomEcg({ SOPClassUID: '1.2.3.4.5.6.7.8.9.0' }, '1.2.840.10008.1.2');
      ecg.render();
    }).to.throw();
  });

  it('should throw for non-existent waveform sequence', () => {
    expect(() => {
      const ecg = new DicomEcg(
        { SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2' },
        '1.2.840.10008.1.2'
      );
      ecg.render();
    }).to.throw();
  });

  it('should throw for invalid waveform parameters', () => {
    expect(() => {
      const ecg = new DicomEcg(
        {
          SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
          WaveformSequence: [
            {
              NumberOfWaveformChannels: 1,
              NumberOfWaveformSamples: 2,
              SamplingFrequency: 2,
              WaveformBitsAllocated: 8,
            },
          ],
        },
        '1.2.840.10008.1.2'
      );
      ecg.render();
    }).to.throw();

    expect(() => {
      const ecg = new DicomEcg(
        {
          SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
          WaveformSequence: [
            {
              NumberOfWaveformChannels: 1,
              NumberOfWaveformSamples: 2,
              SamplingFrequency: 2,
              WaveformBitsAllocated: 16,
              WaveformSampleInterpretation: 'US',
            },
          ],
        },
        '1.2.840.10008.1.2'
      );
      ecg.render();
    }).to.throw();

    expect(() => {
      const ecg = new DicomEcg(
        {
          SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
          WaveformSequence: [
            {
              NumberOfWaveformChannels: 1,
              NumberOfWaveformSamples: 2,
              SamplingFrequency: 2,
              WaveformBitsAllocated: 16,
              WaveformSampleInterpretation: 'SS',
              ChannelDefinitionSequence: [
                {
                  WaveformBitsStored: 8,
                },
              ],
            },
          ],
        },
        '1.2.840.10008.1.2'
      );
      ecg.render();
    }).to.throw();
  });

  it('should render a basic waveform', () => {
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 1,
            NumberOfWaveformSamples: 2,
            SamplingFrequency: 2,
            WaveformBitsAllocated: 16,
            WaveformSampleInterpretation: 'SS',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [
                  {
                    CodeValue: 'uV',
                  },
                ],
              },
            ],
            WaveformData: [Uint8Array.from([0x7f, 0x7f, -0x7f, -0x7f]).buffer],
          },
        ],
        WaveformAnnotationSequence: [
          {
            UnformattedTextValue: 'ECG NORMAL',
          },
          {
            ConceptNameCodeSequence: [
              {
                CodeMeaning: 'QRS Duration',
              },
            ],
            NumericValue: '120',
          },
        ],
      },
      '1.2.840.10008.1.2'
    );
    const ret = ecg.render({
      speed: 20,
      amplitude: 10,
    });

    expect(ret.info.find((i) => i.key === 'QRS Duration').value).to.be.eq('120');
    expect(ret.info.find((i) => i.key === 'Sampling Frequency').value).to.be.eq(2);
    expect(ret.info.find((i) => i.key === 'Duration').value).to.be.eq(2 / 2);
    expect(ret.info.find((i) => i.key === 'Annotation').value[0]).to.be.eq('ECG NORMAL');

    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;
      expect(result.svg.$).to.exist;
    });
  });
});
