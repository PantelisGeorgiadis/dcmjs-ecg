import log = require('loglevel');

declare class DicomEcg {
  /**
   * Creates an instance of DicomEcg.
   */
  constructor(elementsOrBuffer?: Record<string, unknown> | ArrayBuffer, transferSyntaxUid?: string);

  /**
   * Gets element value.
   */
  getElement(tag: string): string | undefined;

  /**
   * Sets element value.
   */
  setElement(tag: string, value: string): void;

  /**
   * Gets all elements.
   */
  getElements(): Record<string, unknown>;

  /**
   * Gets DICOM transfer syntax UID.
   */
  getTransferSyntaxUid(): string;

  /**
   * Sets DICOM transfer syntax UID.
   */
  setTransferSyntaxUid(transferSyntaxUid: string): void;

  /**
   * Gets elements encoded in a DICOM dataset buffer.
   */
  getDenaturalizedDataset(): ArrayBuffer;

  /**
   * Renders the ECG.
   */
  render(opts?: {
    speed?: number;
    amplitude?: number;
    /**
     * @deprecated Use {@link opts.speed} instead.
     */
    millimeterPerSecond?: number;
    /**
     * @deprecated Use {@link opts.amplitude} instead.
     */
    millimeterPerMillivolt?: number;
    applyLowPassFilter?: boolean;
  }): {
    info: Array<{ key: string; value: unknown; unit?: string }>;
    svg: string;
  };

  /**
   * Gets the ECG description.
   */
  toString(): string;
}

/**
 * Version.
 */
declare const version: string;

export { DicomEcg, log, version };
