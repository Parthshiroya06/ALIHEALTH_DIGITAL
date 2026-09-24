declare function btoa(data: string): string;

import {base64ToBytes} from '../src/utils/base64';
import {parseHeartRate} from '../src/utils/bleParsers';

const toBase64 = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

describe('BLE parsers', () => {
  it('decodes base64', () => {
    expect(Array.from(base64ToBytes(toBase64([0, 72, 255, 1])))).toEqual([
      0, 72, 255, 1,
    ]);
  });

  it('parses 8-bit heart rate', () => {
    expect(parseHeartRate(toBase64([0x00, 72]))).toBe(72);
  });

  it('parses 16-bit heart rate', () => {
    expect(parseHeartRate(toBase64([0x01, 0x2c, 0x01]))).toBe(300);
  });
});
