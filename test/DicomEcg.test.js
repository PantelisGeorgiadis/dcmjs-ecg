const DicomEcg = require('./../src/DicomEcg');

const dcmjs = require('dcmjs');
const { dicomJson } = dcmjs.utilities;

const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const chai = require('chai');
const expect = chai.expect;

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
    expect(dicomJson.pnObjectToString(image2.getElement('PatientName'))).to.be.eq(patientName);
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
                  WaveformBitsStored: 32,
                },
              ],
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
              WaveformBitsAllocated: 32,
              WaveformSampleInterpretation: 'SS',
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
              ChannelDefinitionSequence: [],
            },
          ],
        },
        '1.2.840.10008.1.2'
      );
      ecg.render();
    }).to.throw();
  });

  it('should render an 8-bit signed waveform', () => {
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 1,
            NumberOfWaveformSamples: 2,
            SamplingFrequency: 2,
            WaveformBitsAllocated: 8,
            WaveformSampleInterpretation: 'SB',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 8,
                ChannelSensitivityUnitsSequence: [
                  {
                    CodeValue: 'uV',
                  },
                ],
              },
            ],
            WaveformData: [new Uint8Array([0x7f, 0x81]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );
    const ret = ecg.render({
      speed: 20,
      amplitude: 10,
    });

    expect(ret.info.find((i) => i.key === 'Sampling Frequency').value).to.be.eq(2);
    expect(ret.info.find((i) => i.key === 'Duration').value).to.be.eq(2 / 2);

    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;
      expect(result.svg.$).to.exist;
    });
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

  it('should render a waveform without channel sensitivity units as µV', () => {
    // When ChannelSensitivity / ChannelSensitivityUnitsSequence are absent,
    // raw counts must be treated as µV.
    const rawValue = 1000;
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
                // No ChannelSensitivity, no ChannelSensitivityUnitsSequence
              },
            ],
            WaveformData: [new Int16Array([rawValue, -rawValue]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );
    const ret = ecg.render({ speed: 25, amplitude: 5 });

    // minMax should be 1.0 mV (1000 counts ÷ 1000), not 1000 mV
    expect(ret.info.find((i) => i.key === 'Height').value).to.be.lessThan(200);

    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result.svg).to.exist;
    });
  });

  it('should support toString and setTransferSyntaxUid', () => {
    const ecg = new DicomEcg({ PatientID: 'TESTID' }, '1.2.840.10008.1.2');
    const str = ecg.toString();
    expect(str).to.include('DICOM ECG:');
    expect(str).to.include('TESTID');

    ecg.setTransferSyntaxUid('1.2.840.10008.1.2.1');
    expect(ecg.getTransferSyntaxUid()).to.be.eq('1.2.840.10008.1.2.1');

    const empty = new DicomEcg();
    expect(empty.getElements()).to.deep.equal({});
  });

  it('should construct from a P10 buffer', () => {
    const { DicomDict, DicomMetaDictionary } = dcmjs.data;
    const elements = {
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
      PatientID: 'P10TEST',
    };
    const denaturalized = DicomMetaDictionary.denaturalizeDataset(elements);
    const dicomDict = new DicomDict({ TransferSyntaxUID: '1.2.840.10008.1.2' });
    dicomDict.dict = denaturalized;
    const p10Buffer = dicomDict.write();

    const ecg = new DicomEcg(p10Buffer);
    expect(ecg.getElement('SOPClassUID')).to.be.eq('1.2.840.10008.5.1.4.1.1.9.1.2');
    expect(ecg.getTransferSyntaxUid()).to.be.a('string').and.not.be.empty;
  });

  it('should support getDenaturalizedDataset with nameMap and explicit transfer syntax', () => {
    const ecg1 = new DicomEcg({ PatientID: 'EXPLICIT_TS' }, '1.2.840.10008.1.2.1');

    const buf = ecg1.getDenaturalizedDataset(undefined, {});
    expect(buf).to.be.instanceOf(ArrayBuffer);

    const ecg2 = new DicomEcg(buf, '1.2.840.10008.1.2.1');
    expect(ecg2.getTransferSyntaxUid()).to.be.eq('1.2.840.10008.1.2.1');
    expect(ecg2.getElement('PatientID')).to.be.eq('EXPLICIT_TS');
  });

  it('should render a waveform with low pass filter applied', () => {
    const samples = new Int16Array([
      1000, -1000, 1000, -1000, 1000, -1000, 1000, -1000, 1000, -1000,
    ]);
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 1,
            NumberOfWaveformSamples: 10,
            SamplingFrequency: 10,
            WaveformBitsAllocated: 16,
            WaveformSampleInterpretation: 'SS',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
              },
            ],
            WaveformData: [samples.buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10, applyLowPassFilter: true });
    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result.svg).to.exist;
    });
  });

  it('should render an 8-bit unsigned waveform', () => {
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 1,
            NumberOfWaveformSamples: 2,
            SamplingFrequency: 2,
            WaveformBitsAllocated: 8,
            WaveformSampleInterpretation: 'UB',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 8,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
              },
            ],
            WaveformData: [new Uint8Array([200, 100]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10 });
    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result.svg).to.exist;
    });
  });

  it('should render a waveform with mV units, channel sensitivity and baseline', () => {
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
                ChannelSensitivity: 0.001,
                ChannelSensitivityCorrectionFactor: 1.0,
                ChannelBaseline: 0,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'mV' }],
              },
            ],
            WaveformData: [new Int16Array([2000, -2000]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10 });
    expect(ret.info.find((i) => i.key === 'Sampling Frequency').value).to.be.eq(2);
    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result.svg).to.exist;
    });
  });

  it('should compute VRate from RR Interval when VRate is absent', () => {
    const samples = new Int16Array([
      1000, -1000, 1000, -1000, 1000, -1000, 1000, -1000, 1000, -1000,
    ]);
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 1,
            NumberOfWaveformSamples: 10,
            SamplingFrequency: 10,
            WaveformBitsAllocated: 16,
            WaveformSampleInterpretation: 'SS',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
              },
            ],
            WaveformData: [samples.buffer],
          },
        ],
        WaveformAnnotationSequence: [
          {
            ConceptNameCodeSequence: [{ CodeMeaning: 'RR Interval' }],
            NumericValue: '10',
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10 });
    const vRate = ret.info.find((i) => i.key === 'VRate');
    expect(vRate).to.not.be.undefined;
    expect(vRate.value).to.be.eq(60);
  });

  it('should render a waveform with MDC and SCPECG coded channel sources', () => {
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 4,
            NumberOfWaveformSamples: 2,
            SamplingFrequency: 2,
            WaveformBitsAllocated: 16,
            WaveformSampleInterpretation: 'SS',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
                ChannelSourceSequence: [{ CodeMeaning: 'II' }],
              },
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
                ChannelSourceSequence: [{ CodeValue: '2:1', CodingSchemeDesignator: 'MDC' }],
              },
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
                ChannelSourceSequence: [{ CodeValue: '99:99', CodingSchemeDesignator: 'MDC' }],
              },
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
                ChannelSourceSequence: [
                  { CodeValue: '5.6.3-9-2', CodingSchemeDesignator: 'SCPECG' },
                ],
              },
            ],
            WaveformData: [new Int16Array([1000, 500, 200, 100, -1000, -500, -200, -100]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10 });
    parser.parseString(ret.svg, (err, result) => {
      expect(err).to.be.null;
      expect(result.svg).to.exist;
    });
    expect(ret.svg).to.include('>I<');
    expect(ret.svg).to.include('>II<');
  });

  it('should handle channel count mismatch gracefully', () => {
    const ecg = new DicomEcg(
      {
        SOPClassUID: '1.2.840.10008.5.1.4.1.1.9.1.2',
        WaveformSequence: [
          {
            NumberOfWaveformChannels: 2,
            NumberOfWaveformSamples: 2,
            SamplingFrequency: 2,
            WaveformBitsAllocated: 16,
            WaveformSampleInterpretation: 'SS',
            ChannelDefinitionSequence: [
              {
                WaveformBitsStored: 16,
                ChannelSensitivityUnitsSequence: [{ CodeValue: 'uV' }],
              },
            ],
            WaveformData: [new Int16Array([1000, -1000, 500, -500]).buffer],
          },
        ],
      },
      '1.2.840.10008.1.2'
    );

    const ret = ecg.render({ speed: 25, amplitude: 10 });
    expect(ret.svg).to.include('<svg');
  });
});
