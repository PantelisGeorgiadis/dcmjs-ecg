[![NPM version][npm-version-image]][npm-url] [![build][build-image]][build-url] [![MIT License][license-image]][license-url] 

# dcmjs-ecg
DICOM electrocardiography (ECG) rendering for Node.js and browser using Steve Pieper's [dcmjs][dcmjs-url] library.

### Note
**This effort is a work-in-progress and should not be used for production or clinical purposes.**

### Install
#### Node.js

	npm install dcmjs-ecg

#### Browser

	<script type="text/javascript" src="https://unpkg.com/dcmjs"></script>
	<script type="text/javascript" src="https://unpkg.com/dcmjs-ecg"></script>

### Build

	npm install
	npm run build

### Usage
```js
// Import objects in Node.js
const dcmjsEcg = require('dcmjs-ecg');
const { DicomEcg } = dcmjsEcg;

// Import objects in Browser
const { DicomEcg } = window.dcmjsEcg;

// Create an ArrayBuffer with the contents of the DICOM P10 ECG byte stream.
const ecg = new DicomEcg(arrayBuffer);

// Create rendering options.
const renderingOpts = {
  // Optionally provide the rendering speed in millimeter per second.
  // If not provided, the default value of 25 millimeter per second is used.
  speed: 25.0,
  // Optionally provide the rendering amplitude in millimeter per millivolt.
  // If not provided, the default value of 5 millimeter per millivolt is used.
  amplitude: 5.0,
  // Optionally apply a Butterworth low pass filter with 40Hz cut off frequency.
  // If not provided, the filter is not applied.
  applyLowPassFilter: false
};

// Render ECG.
const renderingResult = ecg.render(renderingOpts);

// Rendered waveform in SVG format.
const svg = renderingResult.svg;

// Array of key-value-unit objects containing waveform information and interpretation.
const info = renderingResult.info;
```
Please check a live example [here][dcmjs-ecg-live-example-url].

### Related libraries
* [dcmjs-dimse][dcmjs-dimse-url] - DICOM DIMSE implementation for Node.js using dcmjs.
* [dcmjs-imaging][dcmjs-imaging-url] - DICOM image and overlay rendering pipeline for Node.js and browser using dcmjs.

### License
dcmjs-ecg is released under the MIT License.

[npm-url]: https://npmjs.org/package/dcmjs-ecg
[npm-version-image]: https://img.shields.io/npm/v/dcmjs-ecg.svg?style=flat

[build-url]: https://github.com/PantelisGeorgiadis/dcmjs-ecg/actions/workflows/build.yml
[build-image]: https://github.com/PantelisGeorgiadis/dcmjs-ecg/actions/workflows/build.yml/badge.svg?branch=master

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE.txt

[dcmjs-url]: https://github.com/dcmjs-org/dcmjs
[dcmjs-dimse-url]: https://github.com/PantelisGeorgiadis/dcmjs-dimse
[dcmjs-imaging-url]: https://github.com/PantelisGeorgiadis/dcmjs-imaging

[dcmjs-ecg-live-example-url]: https://unpkg.com/dcmjs-ecg@latest/build/index.html
