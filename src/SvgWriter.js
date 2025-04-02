//#region SvgWriter
class SvgWriter {
  /**
   * Creates an instance of SvgWriter.
   * @constructor
   * @param {number} width - SVG width.
   * @param {number} height - SVG height.
   * @param {object} [backgroundColor] - Background color object.
   * @param {number} [backgroundColor.r] - Red.
   * @param {number} [backgroundColor.g] - Green.
   * @param {number} [backgroundColor.b] - Blue.
   * @param {number} [backgroundColor.a] - Alpha.
   * @throws {Error} If width or height are not provided.
   */
  constructor(width, height, backgroundColor) {
    if (!width) {
      throw new Error('Width should be provided');
    }
    if (!height) {
      throw new Error('Height should be provided');
    }
    backgroundColor = backgroundColor || { r: 0xff, g: 0xff, b: 0xff, a: 0xff };
    const backgroundColorAndOpacity = this._rgbaToRgbHexAndOpacity(backgroundColor);
    this.svg = [
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
      `<svg viewBox="0 0 ${this._fixDecimal(width)} ${this._fixDecimal(
        height
      )}" xmlns="http://www.w3.org/2000/svg">`,
      `<rect width="100%" height="100%" fill="${backgroundColorAndOpacity.color}" fill-opacity="${backgroundColorAndOpacity.opacity}"/>`,
    ];
  }

  /**
   * Adds a line to the SVG.
   * @method
   * @param {number} x1 - X1.
   * @param {number} y1 - Y1.
   * @param {number} x2 - X2.
   * @param {number} y2 - Y2.
   * @param {object} [lineColor] - Line color object.
   * @param {number} [lineColor.r] - Red.
   * @param {number} [lineColor.g] - Green.
   * @param {number} [lineColor.b] - Blue.
   * @param {number} [lineColor.a] - Alpha.
   * @param {number} [lineWidth] - Line width.
   */
  line(x1, y1, x2, y2, lineColor, lineWidth) {
    lineColor = lineColor || { r: 0x00, g: 0x00, b: 0x00, a: 0xff };
    lineWidth = lineWidth || 1;
    const lineColorAndOpacity = this._rgbaToRgbHexAndOpacity(lineColor);
    this.svg.push(
      `<line x1="${this._fixDecimal(x1)}" y1="${this._fixDecimal(y1)}" x2="${this._fixDecimal(
        x2
      )}" y2="${this._fixDecimal(y2)}" stroke="${lineColorAndOpacity.color}" stroke-opacity="${
        lineColorAndOpacity.opacity
      }" stroke-width="${lineWidth}"/>`
    );
  }

  /**
   * Adds a path to the SVG.
   * @method
   * @param {Array<Object>} path - Path object.
   * @param {object} [lineColor] - Line color object.
   * @param {number} [lineColor.r] - Red.
   * @param {number} [lineColor.g] - Green.
   * @param {number} [lineColor.b] - Blue.
   * @param {number} [lineColor.a] - Alpha.
   * @param {number} [lineWidth] - Line width.
   * @param {string} [lineJoin] - Line join style.
   * @param {string} [lineCap] - Line cap style.
   */
  path(path, lineColor, lineWidth, lineJoin, lineCap) {
    lineColor = lineColor || { r: 0x00, g: 0x00, b: 0x00, a: 0xff };
    lineWidth = lineWidth || 1;
    lineJoin = lineJoin || 'round';
    lineCap = lineCap || 'round';

    const pathColorAndOpacity = this._rgbaToRgbHexAndOpacity(lineColor);
    const pathArray = Array.isArray(path) ? path : [path];
    const pathData = [];
    let lastX = undefined;
    let lastY = undefined;

    pathArray.forEach((n) => {
      if (n.x1 !== lastX && n.y1 !== lastY) {
        pathData.push(
          `M ${this._fixDecimal(n.x1)} ${this._fixDecimal(n.y1)} L ${this._fixDecimal(
            n.x2
          )} ${this._fixDecimal(n.y2)}`
        );
        lastX = n.x2;
        lastY = n.y2;
      } else {
        pathData.push(`L ${this._fixDecimal(n.x2)} ${this._fixDecimal(n.y2)}`);
      }
    });

    this.svg.push(
      `<path d="${pathData.join(' ')}" stroke="${pathColorAndOpacity.color}" stroke-opacity="${
        pathColorAndOpacity.opacity
      }" stroke-width="${lineWidth}" stroke-linejoin="${lineJoin}" stroke-linecap="${lineCap}" fill="none" fill-opacity="none"/>`
    );
  }

  /**
   * Adds a rectangle to the SVG.
   * @method
   * @param {number} x - X.
   * @param {number} y - Y.
   * @param {number} width - Width.
   * @param {number} height - Height.
   * @param {object} [fillColor] - Fill color object.
   * @param {number} [fillColor.r] - Red.
   * @param {number} [fillColor.g] - Green.
   * @param {number} [fillColor.b] - Blue.
   * @param {number} [fillColor.a] - Alpha.
   * @param {object} [lineColor] - Line color object.
   * @param {number} [lineColor.r] - Red.
   * @param {number} [lineColor.g] - Green.
   * @param {number} [lineColor.b] - Blue.
   * @param {number} [lineColor.a] - Alpha.
   * @param {number} [lineWidth] - Line width.
   */
  rect(x, y, width, height, fillColor, lineColor, lineWidth) {
    fillColor = fillColor || { r: 0x00, g: 0x00, b: 0x00, a: 0xff };
    lineColor = lineColor || { r: 0x00, g: 0x00, b: 0x00, a: 0xff };
    lineWidth = lineWidth || 1;
    const fillColorAndOpacity = this._rgbaToRgbHexAndOpacity(fillColor);
    const lineColorAndOpacity = this._rgbaToRgbHexAndOpacity(lineColor);
    this.svg.push(
      `<rect x="${this._fixDecimal(x)}" y="${this._fixDecimal(y)}" width="${this._fixDecimal(
        width
      )}" height="${this._fixDecimal(height)}" fill="${fillColorAndOpacity.color}" fill-opacity="${
        fillColorAndOpacity.opacity
      }" stroke="${lineColorAndOpacity.color}" stroke-opacity="${
        lineColorAndOpacity.opacity
      }" stroke-width="${lineWidth}"/>`
    );
  }

  /**
   * Adds text to the SVG.
   * @method
   * @param {number} x - X.
   * @param {number} y - Y.
   * @param {string} text - Text.
   * @param {object} [fontColor] - Line color object.
   * @param {number} [fontColor.r] - Red.
   * @param {number} [fontColor.g] - Green.
   * @param {number} [fontColor.b] - Blue.
   * @param {number} [fontColor.a] - Alpha.
   * @param {number} [fontSize] - Font size.
   * @param {string} [fontWeight] - Font weight.
   */
  text(x, y, text, fontColor, fontSize, fontWeight) {
    fontColor = fontColor || { r: 0x00, g: 0x00, b: 0x00, a: 0xff };
    fontSize = fontSize || 1;
    fontWeight = fontWeight || 'normal';
    const fontColorAndOpacity = this._rgbaToRgbHexAndOpacity(fontColor);
    this.svg.push(
      `<text x="${this._fixDecimal(x)}" y="${this._fixDecimal(
        y
      )}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${
        fontColorAndOpacity.color
      }" fill-opacity="${fontColorAndOpacity.opacity}">${text}</text>`
    );
  }

  /**
   * Gets the constructed SVG XML code text.
   * @method
   * @returns {string} SVG XML code text.
   */
  toXmlString() {
    this.svg.push('</svg>');

    return this.svg.join('\n');
  }

  //#region Private Methods
  /**
   * Fixes the decimal points of a number.
   * @method
   * @private
   * @param {number} number - Number to fix.
   * @param {number} decimalPlaces - Number of decimal places.
   * @returns {number} The fixed number.
   */
  _fixDecimal(number, decimalPlaces) {
    decimalPlaces = decimalPlaces || 2;

    return Number.isInteger(number) ? number : number.toFixed(decimalPlaces);
  }

  /**
   * Translates an RGBA color object to an RGB hex color string and opacity.
   * @method
   * @private
   * @param {Object} rgba - RGBA color object.
   * @param {number} [rgba.r] - Red.
   * @param {number} [rgba.g] - Green.
   * @param {number} [rgba.b] - Blue.
   * @param {number} [rgba.a] - Alpha.
   * @returns {Object} ret Returned hex color code and opacity.
   * @returns {string} ret.color Returned hex color code.
   * @returns {number} ret.opacity Returned opacity.
   */
  _rgbaToRgbHexAndOpacity(rgba) {
    return {
      color: '#' + ((1 << 24) | (rgba.r << 16) | (rgba.g << 8) | rgba.b).toString(16).slice(1),
      opacity: this._fixDecimal(rgba.a / 0xff, 1),
    };
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = SvgWriter;
//#endregion
