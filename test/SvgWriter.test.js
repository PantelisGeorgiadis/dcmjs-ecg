const SvgWriter = require('../src/SvgWriter');

const xml2js = require('xml2js');
const parser = new xml2js.Parser();

const chai = require('chai');
const expect = chai.expect;

describe('SvgWriter', () => {
  it('should throw for invalid parameters', () => {
    expect(() => {
      const svg = new SvgWriter();
    }).to.throw();
    expect(() => {
      const svg = new SvgWriter(10);
    }).to.throw();
    expect(() => {
      const svg = new SvgWriter(0, 10);
    }).to.throw();
    expect(() => {
      const svg = new SvgWriter(10, 0);
    }).to.throw();
  });

  it('should correctly generate SVG', () => {
    const svg = new SvgWriter(100, 200, { r: 50, g: 60, b: 70, a: 80 });
    parser.parseString(svg.toXmlString(), (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;
      expect(result.svg.$).to.exist;

      expect(result.svg.$.viewBox).to.be.eq('0 0 100 200');
      expect(result.svg.$.xmlns).to.be.eq('http://www.w3.org/2000/svg');
      expect(result.svg.rect.length).to.be.eq(1);
      expect(result.svg.rect[0].$.width).to.be.eq('100%');
      expect(result.svg.rect[0].$.height).to.be.eq('100%');
      expect(result.svg.rect[0].$.fill).to.be.eq('rgba(50, 60, 70, 80)');
    });
  });

  it('should correctly generate SVG with lines', () => {
    const svg = new SvgWriter(1000, 2000);
    svg.line(10, 20, 30, 40, { r: 50, g: 60, b: 70, a: 80 }, 90);
    svg.line(100, 200, 300, 400, { r: 5, g: 6, b: 7, a: 8 }, 9);
    svg.line(1, 2, 3, 4);
    parser.parseString(svg.toXmlString(), (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;

      expect(result.svg.line.length).to.be.eq(3);
      expect(result.svg.line[0].$.x1).to.be.eq('10');
      expect(result.svg.line[0].$.y1).to.be.eq('20');
      expect(result.svg.line[0].$.x2).to.be.eq('30');
      expect(result.svg.line[0].$.y2).to.be.eq('40');
      expect(result.svg.line[0].$.stroke).to.be.eq('rgba(50, 60, 70, 80)');
      expect(result.svg.line[0].$['stroke-width']).to.be.eq('90');

      expect(result.svg.line[1].$.x1).to.be.eq('100');
      expect(result.svg.line[1].$.y1).to.be.eq('200');
      expect(result.svg.line[1].$.x2).to.be.eq('300');
      expect(result.svg.line[1].$.y2).to.be.eq('400');
      expect(result.svg.line[1].$.stroke).to.be.eq('rgba(5, 6, 7, 8)');
      expect(result.svg.line[1].$['stroke-width']).to.be.eq('9');

      expect(result.svg.line[2].$.x1).to.be.eq('1');
      expect(result.svg.line[2].$.y1).to.be.eq('2');
      expect(result.svg.line[2].$.x2).to.be.eq('3');
      expect(result.svg.line[2].$.y2).to.be.eq('4');
      expect(result.svg.line[2].$.stroke).to.be.eq('rgba(0, 0, 0, 255)');
      expect(result.svg.line[2].$['stroke-width']).to.be.eq('1');
    });
  });

  it('should correctly generate SVG with paths', () => {
    const svg = new SvgWriter(1000, 2000);
    svg.path(
      [
        { x1: 10, y1: 20, x2: 30, y2: 40 },
        { x1: 40, y1: 30, x2: 20, y2: 10 },
      ],
      { r: 50, g: 60, b: 70, a: 80 },
      90
    );
    svg.path({ x1: 10, y1: 20, x2: 30, y2: 40 });
    svg.path([
      { x1: 10, y1: 20, x2: 30, y2: 40 },
      { x1: 30, y1: 40, x2: 20, y2: 10 },
    ]);
    parser.parseString(svg.toXmlString(), (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;

      expect(result.svg.path.length).to.be.eq(3);
      expect(result.svg.path[0].$.d).to.be.eq('M 10 20 L 30 40 M 40 30 L 20 10');
      expect(result.svg.path[0].$.stroke).to.be.eq('rgba(50, 60, 70, 80)');
      expect(result.svg.path[0].$['stroke-width']).to.be.eq('90');

      expect(result.svg.path[1].$.d).to.be.eq('M 10 20 L 30 40');
      expect(result.svg.path[1].$.stroke).to.be.eq('rgba(0, 0, 0, 255)');
      expect(result.svg.path[1].$['stroke-width']).to.be.eq('1');

      expect(result.svg.path[2].$.d).to.be.eq('M 10 20 L 30 40 L 20 10');
      expect(result.svg.path[2].$.stroke).to.be.eq('rgba(0, 0, 0, 255)');
      expect(result.svg.path[2].$['stroke-width']).to.be.eq('1');
    });
  });

  it('should correctly generate SVG with rectangles', () => {
    const svg = new SvgWriter(10000, 20000);
    svg.rect(
      10,
      20,
      30,
      40,
      { r: 50, g: 60, b: 70, a: 80 },
      { r: 90, g: 100, b: 110, a: 120 },
      130
    );
    svg.rect(1, 2, 3, 4);
    parser.parseString(svg.toXmlString(), (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;

      expect(result.svg.rect.length).to.be.eq(2 + 1 /* Plus one for the background color rect */);
      expect(result.svg.rect[1].$.x).to.be.eq('10');
      expect(result.svg.rect[1].$.y).to.be.eq('20');
      expect(result.svg.rect[1].$.width).to.be.eq('30');
      expect(result.svg.rect[1].$.height).to.be.eq('40');
      expect(result.svg.rect[1].$.fill).to.be.eq('rgba(50, 60, 70, 80)');
      expect(result.svg.rect[1].$.stroke).to.be.eq('rgba(90, 100, 110, 120)');
      expect(result.svg.rect[1].$['stroke-width']).to.be.eq('130');

      expect(result.svg.rect[2].$.x).to.be.eq('1');
      expect(result.svg.rect[2].$.y).to.be.eq('2');
      expect(result.svg.rect[2].$.width).to.be.eq('3');
      expect(result.svg.rect[2].$.height).to.be.eq('4');
      expect(result.svg.rect[2].$.stroke).to.be.eq('rgba(0, 0, 0, 255)');
      expect(result.svg.rect[2].$['stroke-width']).to.be.eq('1');
    });
  });

  it('should correctly generate SVG with text', () => {
    const svg = new SvgWriter(1000, 2000);
    svg.text(10, 20, 'Hello', { r: 30, g: 40, b: 50, a: 60 }, 70, 'bold');
    svg.text(100, 100, 'Hello!');
    parser.parseString(svg.toXmlString(), (err, result) => {
      expect(err).to.be.null;
      expect(result).to.not.be.undefined;
      expect(result.svg).to.exist;

      expect(result.svg.text.length).to.be.eq(2);
      expect(result.svg.text[0].$.x).to.be.eq('10');
      expect(result.svg.text[0].$.y).to.be.eq('20');
      expect(result.svg.text[0].$.fill).to.be.eq('rgba(30, 40, 50, 60)');
      expect(result.svg.text[0].$['font-size']).to.be.eq('70');
      expect(result.svg.text[0].$['font-weight']).to.be.eq('bold');
      expect(result.svg.text[0]._).to.be.eq('Hello');

      expect(result.svg.text[1].$.x).to.be.eq('100');
      expect(result.svg.text[1].$.y).to.be.eq('100');
      expect(result.svg.text[1].$.fill).to.be.eq('rgba(0, 0, 0, 255)');
      expect(result.svg.text[1].$['font-size']).to.be.eq('1');
      expect(result.svg.text[1].$['font-weight']).to.be.eq('normal');
      expect(result.svg.text[1]._).to.be.eq('Hello!');
    });
  });
});
