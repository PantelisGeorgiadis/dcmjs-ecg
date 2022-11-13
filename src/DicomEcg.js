const SvgWriter = require('./SvgWriter');
const log = require('./log');

const dcmjs = require('dcmjs');
const { DicomMetaDictionary, DicomMessage, ReadBufferStream, WriteBufferStream } = dcmjs.data;
const dcmjsLog = dcmjs.log;

//#region AllowedSopClassUids
/**
 * Allowed SOP class UIDs.
 * @constant {Array<string>}
 */
const AllowedSopClassUids = [
  // 12-lead ECG Waveform Storage
  '1.2.840.10008.5.1.4.1.1.9.1.1',
  // General ECG Waveform Storage
  '1.2.840.10008.5.1.4.1.1.9.1.2',
  // Ambulatory ECG Waveform Storage
  '1.2.840.10008.5.1.4.1.1.9.1.3',
  // Hemodynamic Waveform Storage
  '1.2.840.10008.5.1.4.1.1.9.2.1',
  // Cardiac Electrophysiology Waveform Storage
  '1.2.840.10008.5.1.4.1.1.9.3.1',
];
Object.freeze(AllowedSopClassUids);
//#endregion

//#region Dpi
/**
 * Dots per inch.
 * @constant {number}
 */
const Dpi = 96.0;
Object.freeze(Dpi);
//#endregion

//#region PixelsPerMm
/**
 * Pixels per millimeter.
 * @constant {number}
 */
const PixelsPerMm = Dpi / 25.4;
Object.freeze(PixelsPerMm);
//#endregion

//#region RenderingDefaults
/**
 * Rendering defaults.
 * @constant {Object}
 */
const RenderingDefaults = {
  DefaultMillimeterPerSecond: 25.0,
  DefaultMillimeterPerMillivolt: 5.0,
  DefaultPaperBackgroundColor: { r: 0xff, g: 0xff, b: 0xff, a: 0xff },
  DefaultGridBackgroundColor: { r: 0xd2, g: 0xd2, b: 0xd2, a: 0xff },
  DefaultGridForegroundColor: { r: 0xe3, g: 0x45, b: 0x38, a: 0xaf },
  DefaultSignalColor: { r: 0x00, g: 0x00, b: 0x00, a: 0xff },
  DefaultTextColor: { r: 0x00, g: 0x00, b: 0x00, a: 0xff },
};
Object.freeze(RenderingDefaults);
//#endregion

//#region DicomEcg
class DicomEcg {
  /**
   * Creates an instance of DicomEcg.
   * @constructor
   * @param {Object|ArrayBuffer} [elementsOrBuffer] - Dataset elements as object or encoded as a DICOM dataset buffer.
   * @param {string} [transferSyntaxUid] - Dataset transfer syntax.
   */
  constructor(elementsOrBuffer, transferSyntaxUid) {
    dcmjsLog.level = 'error';

    this.transferSyntaxUid = transferSyntaxUid || '1.2.840.10008.1.2';
    if (elementsOrBuffer instanceof ArrayBuffer) {
      if (transferSyntaxUid) {
        this.elements = this._fromElementsBuffer(elementsOrBuffer, transferSyntaxUid);
      } else {
        const ret = this._fromP10Buffer(elementsOrBuffer);
        this.elements = ret.elements;
        this.transferSyntaxUid = ret.transferSyntaxUid;
      }
      return;
    }

    this.elements = elementsOrBuffer || {};
  }

  /**
   * Gets element value.
   * @method
   * @param {string} tag - Element tag.
   * @returns {string|undefined} Element value or undefined if element doesn't exist.
   */
  getElement(tag) {
    return this.elements[tag];
  }

  /**
   * Sets element value.
   * @method
   * @param {string} tag - Element tag.
   * @param {string} value - Element value.
   */
  setElement(tag, value) {
    this.elements[tag] = value;
  }

  /**
   * Gets all elements.
   * @method
   * @returns {Object} Elements.
   */
  getElements() {
    return this.elements;
  }

  /**
   * Gets DICOM transfer syntax UID.
   * @method
   * @returns {string} Transfer syntax UID.
   */
  getTransferSyntaxUid() {
    return this.transferSyntaxUid;
  }

  /**
   * Sets DICOM transfer syntax UID.
   * @method
   * @param {string} transferSyntaxUid - Transfer Syntax UID.
   */
  setTransferSyntaxUid(transferSyntaxUid) {
    this.transferSyntaxUid = transferSyntaxUid;
  }

  /**
   * Gets elements encoded in a DICOM dataset buffer.
   * @method
   * @returns {ArrayBuffer} DICOM dataset.
   */
  getDenaturalizedDataset() {
    const denaturalizedDataset = DicomMetaDictionary.denaturalizeDataset(this.getElements());
    const stream = new WriteBufferStream();
    DicomMessage.write(denaturalizedDataset, stream, this.transferSyntaxUid, {});

    return stream.getBuffer();
  }

  /**
   * Renders the ECG.
   * @method
   * @param {Object} [opts] - Rendering options.
   * @param {number} [opts.millimeterPerSecond] - Waveform render speed in millimeter per second.
   * @param {number} [opts.millimeterPerMillivolt] - Waveform render amplitude in millimeter per millivolt.
   * @param {boolean} [opts.applyLowPassFilter] - Apply a butterworth low pass filter with 40Hz cut off frequency.
   * @returns {Object} result Rendering result object.
   * @returns {Array<Object>} result.info Array of waveform information.
   * @returns {string} result.svg Rendered waveform in SVG format.
   */
  render(opts) {
    opts = opts || {};
    opts.millimeterPerSecond =
      opts.millimeterPerSecond || RenderingDefaults.DefaultMillimeterPerSecond;
    opts.millimeterPerMillivolt =
      opts.millimeterPerMillivolt || RenderingDefaults.DefaultMillimeterPerMillivolt;
    opts.applyLowPassFilter = opts.applyLowPassFilter || false;

    return this._render(opts);
  }

  /**
   * Gets the ECG description.
   * @method
   * @returns {string} DICOM ECG description.
   */
  toString() {
    const str = [];
    str.push('DICOM ECG:');
    str.push('='.repeat(50));
    str.push(JSON.stringify(this.getElements()));

    return str.join('\n');
  }

  //#region Private Methods
  /**
   * Loads a dataset from p10 buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - DICOM P10 array buffer.
   * @returns {Object} Dataset elements and transfer syntax UID.
   */
  _fromP10Buffer(arrayBuffer) {
    const dicomDict = DicomMessage.readFile(arrayBuffer, { ignoreErrors: true });
    const meta = DicomMetaDictionary.naturalizeDataset(dicomDict.meta);
    const transferSyntaxUid = meta.TransferSyntaxUID;
    const elements = DicomMetaDictionary.naturalizeDataset(dicomDict.dict);

    return { elements, transferSyntaxUid };
  }

  /**
   * Loads a dataset from elements only buffer.
   * @method
   * @private
   * @param {ArrayBuffer} arrayBuffer - Elements array buffer.
   * @param {string} transferSyntaxUid - Transfer Syntax UID.
   * @returns {Object} Dataset elements.
   */
  _fromElementsBuffer(arrayBuffer, transferSyntaxUid) {
    const stream = new ReadBufferStream(arrayBuffer);
    // Use the proper syntax length (based on transfer syntax UID)
    // since dcmjs doesn't do that internally.
    let syntaxLengthTypeToDecode =
      transferSyntaxUid === '1.2.840.10008.1.2' ? '1.2.840.10008.1.2' : '1.2.840.10008.1.2.1';
    const denaturalizedDataset = DicomMessage._read(stream, syntaxLengthTypeToDecode, {
      ignoreErrors: true,
    });

    return DicomMetaDictionary.naturalizeDataset(denaturalizedDataset);
  }

  /**
   * Rendering implementation.
   * @method
   * @private
   * @param {Object} [opts] - Rendering options.
   * @param {number} [opts.millimeterPerSecond] - Waveform render speed in millimeter per second.
   * @param {number} [opts.millimeterPerMillivolt] - Waveform render amplitude in millimeter per millivolt.
   * @param {boolean} [opts.applyLowPassFilter] - Apply a butterworth low pass filter with 40Hz cut off frequency.
   * @returns {Object} result Rendering result object.
   * @returns {Array<Object>} result.info Array of waveform information.
   * @returns {string} result.svg Rendered waveform in SVG format.
   * @throws Error if SOP class UID is not supported.
   */
  _render(opts) {
    const sopClass = this.getElement('SOPClassUID');
    if (!AllowedSopClassUids.includes(sopClass)) {
      throw new Error(`SOP class UID is not supported [${sopClass}]`);
    }

    // Extract waveform
    const waveform = this._extractWaveform(opts);

    // Extract waveform info
    const info = this._extractInformation(waveform);

    // Extract annotation
    const annotation = this._extractAnnotation();
    if (annotation.length > 0) {
      info.push({ key: 'Annotation', value: annotation });
    }

    // Additional info
    info.push({ key: 'Sampling Frequency', value: waveform.samplingFrequency, unit: 'Hz' });
    info.push({
      key: 'Duration',
      value: waveform.samples / waveform.samplingFrequency,
      unit: 'sec',
    });
    info.push({ key: 'Speed', value: opts.millimeterPerSecond, unit: 'mm/sec' });
    info.push({ key: 'Amplitude', value: opts.millimeterPerMillivolt, unit: 'mm/mV' });

    // Render
    const leads = waveform.leads.length;
    const width = Math.trunc(
      (opts.millimeterPerSecond * PixelsPerMm * waveform.samples) / waveform.samplingFrequency
    );
    const height = Math.trunc(
      opts.millimeterPerMillivolt * PixelsPerMm * Math.ceil(waveform.minMax) * 2 * leads
    );
    const leadHeight = Math.trunc(height / leads);
    const svgWriter = new SvgWriter(width, height, RenderingDefaults.DefaultPaperBackgroundColor);

    for (let i = 0; i < leads; i++) {
      this._renderLeadGrid(svgWriter, i, width, leadHeight);
      this._renderLeadSignal(svgWriter, waveform, waveform.leads[i], i, width, leadHeight);
      this._renderLeadTitle(svgWriter, waveform.leads[i], i, leadHeight);
    }

    return { svg: svgWriter.toXmlString(), info };
  }

  /**
   * Extracts waveform.
   * @method
   * @private
   * @param {Object} [opts] - Rendering options.
   * @param {boolean} [opts.applyLowPassFilter] - Apply a butterworth low pass filter with 40Hz cut off frequency.
   * @returns {Object} Waveform.
   * @throws Error if WaveformSequence is empty and sample interpretation
   * or bits allocated values are not supported.
   */
  _extractWaveform(opts) {
    const waveformSequence = this.getElement('WaveformSequence');
    if (
      waveformSequence === undefined ||
      !Array.isArray(waveformSequence) ||
      waveformSequence.length === 0
    ) {
      throw new Error('WaveformSequence is empty');
    }
    const waveformSequenceItem = waveformSequence.find((o) => o);
    if (waveformSequenceItem.WaveformSampleInterpretation !== 'SS') {
      throw new Error(
        `Waveform sample interpretation is not supported [${waveformSequenceItem.WaveformSampleInterpretation}]`
      );
    }
    if (waveformSequenceItem.WaveformBitsAllocated !== 16) {
      throw new Error(
        `Waveform bits allocated is not supported [${waveformSequenceItem.WaveformBitsAllocated}]`
      );
    }
    const waveform = {
      channelDefinitionSequence: waveformSequenceItem.ChannelDefinitionSequence,
      waveformData: waveformSequenceItem.WaveformData,
      channels: waveformSequenceItem.NumberOfWaveformChannels,
      samples: waveformSequenceItem.NumberOfWaveformSamples,
      samplingFrequency: waveformSequenceItem.SamplingFrequency,
      duration:
        waveformSequenceItem.NumberOfWaveformSamples / waveformSequenceItem.SamplingFrequency,
    };
    this._calculateLeads(waveform, opts);

    return waveform;
  }

  /**
   * Calculates waveform leads.
   * @method
   * @private
   * @param {Object} waveform - Waveform.
   * @param {Object} [opts] - Rendering options.
   * @param {boolean} [opts.applyLowPassFilter] - Apply a butterworth low pass filter with 40Hz cut off frequency.
   * @throws Error if waveform bits stored definition value is not supported.
   */
  _calculateLeads(waveform, opts) {
    const channelDefinitionSequence = waveform.channelDefinitionSequence;
    if (
      channelDefinitionSequence === undefined ||
      !Array.isArray(channelDefinitionSequence) ||
      channelDefinitionSequence.length === 0
    ) {
      throw new Error('ChannelDefinitionSequence is empty');
    }

    if (waveform.channels !== channelDefinitionSequence.length) {
      log.warn(
        `Waveform number of channels [${waveform.channels}] are not equal to channel definition sequence length [${channelDefinitionSequence.length}]. Proceeding with channel definition sequence length.`
      );
    }

    const channels = channelDefinitionSequence.length;
    const factor = new Array(channels).fill(1.0);
    const baseline = new Array(channels).fill(0.0);

    const units = [];
    const sources = [];
    channelDefinitionSequence.forEach((channelDefinitionSequenceItem, i) => {
      if (channelDefinitionSequenceItem !== undefined) {
        if (channelDefinitionSequenceItem.WaveformBitsStored !== 16) {
          throw new Error(
            `Waveform bits stored definition is not supported [${channelDefinitionSequenceItem.WaveformBitsStored}]`
          );
        }

        if (
          channelDefinitionSequenceItem.ChannelSensitivity !== undefined &&
          channelDefinitionSequenceItem.ChannelSensitivityCorrectionFactor !== undefined
        ) {
          factor[i] =
            channelDefinitionSequenceItem.ChannelSensitivity *
            channelDefinitionSequenceItem.ChannelSensitivityCorrectionFactor;
        }
        if (channelDefinitionSequenceItem.ChannelBaseline !== undefined) {
          baseline[i] = channelDefinitionSequenceItem.ChannelBaseline;
        }

        const channelSensitivityUnitsSequence =
          channelDefinitionSequenceItem.ChannelSensitivityUnitsSequence;
        if (
          channelSensitivityUnitsSequence !== undefined &&
          Array.isArray(channelSensitivityUnitsSequence) &&
          channelSensitivityUnitsSequence.length > 0
        ) {
          const channelSensitivityUnitsSequenceFirstItem = channelSensitivityUnitsSequence[0];
          if (channelSensitivityUnitsSequenceFirstItem.CodeValue !== undefined) {
            units.push(channelSensitivityUnitsSequenceFirstItem.CodeValue);
          }
        }

        const channelSourceSequence = channelDefinitionSequenceItem.ChannelSourceSequence;
        if (
          channelSourceSequence !== undefined &&
          Array.isArray(channelSourceSequence) &&
          channelSourceSequence.length !== 0
        ) {
          channelSourceSequence.forEach((channelSourceSequenceItem) => {
            let title =
              channelSourceSequenceItem.CodeMeaning !== undefined
                ? channelSourceSequenceItem.CodeMeaning
                : '';
            const codeValue = channelSourceSequenceItem.CodeValue;
            const schemeDesignator = channelSourceSequenceItem.CodingSchemeDesignator;
            if (codeValue !== undefined && schemeDesignator !== undefined) {
              if (schemeDesignator === 'MDC') {
                const mdcCodeTitle = [
                  { code: '2:1', title: 'Lead I' },
                  { code: '2:2', title: 'Lead II' },
                  { code: '2:61', title: 'Lead III' },
                  { code: '2:62', title: 'Lead aVR' },
                  { code: '2:63', title: 'Lead aVL' },
                  { code: '2:64', title: 'Lead aVF' },
                  { code: '2:3', title: 'Lead V1' },
                  { code: '2:4', title: 'Lead V2' },
                  { code: '2:5', title: 'Lead V3' },
                  { code: '2:6', title: 'Lead V4' },
                  { code: '2:7', title: 'Lead V5' },
                  { code: '2:8', title: 'Lead V6' },
                ].find((i) => i.code === codeValue);
                if (mdcCodeTitle !== undefined) {
                  title = mdcCodeTitle.title;
                }
              } else if (schemeDesignator === 'SCPECG') {
                const scpEcgCodeTitle = [
                  { code: '5.6.3-9-1', title: 'Lead I' },
                  { code: '5.6.3-9-2', title: 'Lead II' },
                  { code: '5.6.3-9-61', title: 'Lead III' },
                  { code: '5.6.3-9-62', title: 'Lead aVR' },
                  { code: '5.6.3-9-63', title: 'Lead aVL' },
                  { code: '5.6.3-9-64', title: 'Lead aVF' },
                  { code: '5.6.3-9-3', title: 'Lead V1' },
                  { code: '5.6.3-9-4', title: 'Lead V2' },
                  { code: '5.6.3-9-5', title: 'Lead V3' },
                  { code: '5.6.3-9-6', title: 'Lead V4' },
                  { code: '5.6.3-9-7', title: 'Lead V5' },
                  { code: '5.6.3-9-8', title: 'Lead V6' },
                ].find((i) => i.code === codeValue);
                if (scpEcgCodeTitle !== undefined) {
                  title = scpEcgCodeTitle.title;
                }
              }
            }

            sources.push(title);
          });
        }
      }
    });

    waveform.leads = [];
    const waveformDataBuffer = new Uint8Array(waveform.waveformData.find((o) => o));
    const waveformData = new Int16Array(
      new Uint16Array(
        waveformDataBuffer.buffer,
        waveformDataBuffer.byteOffset,
        waveformDataBuffer.byteLength / Uint16Array.BYTES_PER_ELEMENT
      )
    );

    // Split to channels
    let signals = waveformData.reduce(
      (rows, key, index) =>
        (index % channels === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows,
      []
    );

    // Transpose
    signals = signals[0].map((x, i) => signals.map((x) => x[i]));

    // Apply baseline and factor
    for (let i = 0; i < channels; i++) {
      for (let j = 0; j < signals[i].length; j++) {
        signals[i][j] = (signals[i][j] + baseline[i]) * factor[i];
      }
    }

    // Filter
    if (opts.applyLowPassFilter === true) {
      const cutoffFrequency = 40.0;
      for (let i = 0; i < channels; i++) {
        this._lowPassFilter(signals[i], cutoffFrequency, waveform.samplingFrequency, 1);
      }
    }

    // Convert to millivolts
    const millivolts = { uV: 1000.0, mV: 1.0 };
    for (let i = 0; i < channels; i++) {
      for (let j = 0; j < signals[i].length; j++) {
        signals[i][j] = signals[i][j] / millivolts[units[i]];
      }
    }

    // Find min/max and assign signal and source
    for (let i = 0; i < channels; i++) {
      waveform.leads.push({
        min: Math.min(...signals[i]),
        max: Math.max(...signals[i]),
        signal: signals[i],
        source: sources[i],
      });
    }
    waveform.min = Math.min(...waveform.leads.map((lead) => lead.min));
    waveform.max = Math.max(...waveform.leads.map((lead) => lead.max));
    waveform.minMax = Math.max(
      Math.abs(Math.min(...waveform.leads.map((lead) => lead.min))),
      Math.abs(Math.max(...waveform.leads.map((lead) => lead.max)))
    );
  }

  /**
   * Applies a low-pass filter to sample data.
   * @method
   * @private
   * @param {Array<number>} samples - The sample data to filter.
   * @param {number} cutoff - Cut off frequency.
   * @param {number} sampleRate - Samples rate.
   */
  _lowPassFilter(samples, cutoff, sampleRate) {
    const rc = 1.0 / (cutoff * 2.0 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);
    let lastValue = samples[0];

    for (let i = 0; i < samples.length; i++) {
      lastValue = lastValue + alpha * (samples[i] - lastValue);
      samples[i] = lastValue;
    }
  }

  /**
   * Extracts waveform information.
   * @method
   * @param {Object} waveform - Waveform.
   * @private
   * @returns {Array<Object>} Array of waveform information.
   */
  _extractInformation(waveform) {
    const waveformAnnotationSequence = this.getElement('WaveformAnnotationSequence');
    if (
      waveformAnnotationSequence === undefined ||
      !Array.isArray(waveformAnnotationSequence) ||
      waveformAnnotationSequence.length === 0
    ) {
      return [];
    }
    const info = [];
    waveformAnnotationSequence.forEach((waveformAnnotationSequenceItem) => {
      const conceptNameCodeSequence = waveformAnnotationSequenceItem.ConceptNameCodeSequence;
      if (
        conceptNameCodeSequence !== undefined &&
        Array.isArray(conceptNameCodeSequence) &&
        conceptNameCodeSequence.length !== 0
      ) {
        conceptNameCodeSequence.forEach((conceptNameCodeSequenceItem) => {
          const keyUnitInfo = [
            { key: 'QT Interval', unit: 'ms' },
            { key: 'QTc Interval', unit: 'ms' },
            { key: 'RR Interval', unit: 'ms' },
            { key: 'VRate', unit: 'BPM' },
            { key: 'QRS Duration', unit: 'ms' },
            { key: 'QRS Axis', unit: '°' },
            { key: 'T Axis', unit: '°' },
            { key: 'P Axis', unit: '°' },
            { key: 'PR Interval', unit: 'ms' },
          ].find((i) => i.key === conceptNameCodeSequenceItem.CodeMeaning);
          if (
            waveformAnnotationSequenceItem.NumericValue !== undefined &&
            keyUnitInfo !== undefined
          ) {
            info.push({
              key: conceptNameCodeSequenceItem.CodeMeaning,
              value: waveformAnnotationSequenceItem.NumericValue,
              unit: keyUnitInfo.unit,
            });
          }
        });
      }
    });
    const rrInterval = info.find((i) => i.key === 'RR Interval');
    if (!info.find((i) => i.key === 'VRate') && rrInterval) {
      info.push({
        key: 'VRate',
        value: Math.trunc(((60.0 / waveform.duration) * waveform.samples) / rrInterval.value),
        unit: 'BPM',
      });
    }

    return info;
  }

  /**
   * Extracts waveform annotation.
   * @method
   * @private
   * @returns {Array<string>} Array of waveform annotation.
   */
  _extractAnnotation() {
    const waveformAnnotationSequence = this.getElement('WaveformAnnotationSequence');
    if (
      waveformAnnotationSequence === undefined ||
      !Array.isArray(waveformAnnotationSequence) ||
      waveformAnnotationSequence.length === 0
    ) {
      return [];
    }
    const annotations = [];
    waveformAnnotationSequence.forEach((waveformAnnotationSequenceItem) => {
      if (waveformAnnotationSequenceItem.UnformattedTextValue !== undefined) {
        annotations.push(waveformAnnotationSequenceItem.UnformattedTextValue);
      }
    });

    return annotations;
  }

  /**
   * Renders the lead grid.
   * @method
   * @private
   * @param {SvgWriter} svgWriter - SVG writer object.
   * @param {number} leadIndex - Lead index.
   * @param {number} renderWidth - Render width.
   * @param {number} renderLeadHeight - Render lead height.
   */
  _renderLeadGrid(svgWriter, leadIndex, renderWidth, renderLeadHeight) {
    svgWriter.rect(
      0.0,
      leadIndex * renderLeadHeight,
      renderWidth,
      renderLeadHeight,
      RenderingDefaults.DefaultGridBackgroundColor,
      RenderingDefaults.DefaultGridForegroundColor,
      2.0
    );

    const majorGridPath = [];
    const minorGridPath = [];

    for (let i = 0; i < Math.trunc(renderLeadHeight / PixelsPerMm); i++) {
      if (i % 5 === 0) {
        majorGridPath.push({
          x1: 0.0,
          y1: leadIndex * renderLeadHeight + i * PixelsPerMm,
          x2: renderWidth,
          y2: leadIndex * renderLeadHeight + i * PixelsPerMm,
        });
      } else {
        minorGridPath.push({
          x1: 0.0,
          y1: leadIndex * renderLeadHeight + i * PixelsPerMm,
          x2: renderWidth,
          y2: leadIndex * renderLeadHeight + i * PixelsPerMm,
        });
      }
    }
    svgWriter.path(majorGridPath, RenderingDefaults.DefaultGridForegroundColor, 0.75);
    svgWriter.path(minorGridPath, RenderingDefaults.DefaultGridForegroundColor, 0.25);

    majorGridPath.length = 0;
    minorGridPath.length = 0;

    for (let i = 0; i < Math.trunc(renderWidth / PixelsPerMm); i++) {
      if (i % 5 === 0) {
        majorGridPath.push({
          x1: i * PixelsPerMm,
          y1: leadIndex * renderLeadHeight,
          x2: i * PixelsPerMm,
          y2: leadIndex * renderLeadHeight + renderLeadHeight,
        });
      } else {
        minorGridPath.push({
          x1: i * PixelsPerMm,
          y1: leadIndex * renderLeadHeight,
          x2: i * PixelsPerMm,
          y2: leadIndex * renderLeadHeight + renderLeadHeight,
        });
      }
    }
    svgWriter.path(majorGridPath, RenderingDefaults.DefaultGridForegroundColor, 0.75);
    svgWriter.path(minorGridPath, RenderingDefaults.DefaultGridForegroundColor, 0.25);
  }

  /**
   * Renders the lead signal.
   * @method
   * @private
   * @param {SvgWriter} svgWriter - SVG writer object.
   * @param {Object} waveform - Waveform object.
   * @param {Object} lead - Lead object.
   * @param {number} leadIndex - Lead index.
   * @param {number} renderWidth - Render width.
   * @param {number} renderLeadHeight - Render lead height.
   */
  _renderLeadSignal(svgWriter, waveform, lead, leadIndex, renderWidth, renderLeadHeight) {
    const ratioX = renderWidth / waveform.samples;
    const halfHeight = renderLeadHeight / 2.0;

    let prevX = 0.0;
    let prevY =
      leadIndex * renderLeadHeight +
      (halfHeight -
        this._translate(
          lead.signal[0],
          -Math.ceil(waveform.minMax),
          Math.ceil(waveform.minMax),
          -halfHeight,
          halfHeight
        ));

    const path = [];
    for (let i = 1; i < waveform.samples; i++) {
      const x = ratioX * i;
      const y =
        leadIndex * renderLeadHeight +
        (halfHeight -
          this._translate(
            lead.signal[i],
            -Math.ceil(waveform.minMax),
            Math.ceil(waveform.minMax),
            -halfHeight,
            halfHeight
          ));
      path.push({ x1: prevX, y1: prevY, x2: x, y2: y });
      prevX = x;
      prevY = y;
    }
    svgWriter.path(path, RenderingDefaults.DefaultSignalColor, 1.25);
  }

  /**
   * Translates value range.
   * @method
   * @private
   * @param {number} value - Value to be translated.
   * @param {number} min - Value min.
   * @param {number} max - Value max.
   * @param {number} newMin - New min.
   * @param {number} newMax - New max.
   */
  _translate(value, min, max, newMin, newMax) {
    const span = max - min;
    const newSpan = newMax - newMin;
    const scaled = (value - min) / span;

    return newMin + scaled * newSpan;
  }

  /**
   * Renders the lead title.
   * @method
   * @private
   * @param {SvgWriter} svgWriter - SVG writer object.
   * @param {Object} lead - Lead object.
   * @param {number} leadIndex - Lead index.
   * @param {number} renderLeadHeight - Render lead height.
   */
  _renderLeadTitle(svgWriter, lead, leadIndex, renderLeadHeight) {
    svgWriter.text(
      2.0,
      leadIndex * renderLeadHeight + 10,
      lead.source ? lead.source.replace(/[^a-zA-Z0-9_ ]/g, '') : '',
      RenderingDefaults.DefaultTextColor,
      10,
      'bold'
    );
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = DicomEcg;
//#endregion
