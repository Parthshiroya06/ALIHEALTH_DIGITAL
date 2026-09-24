/* eslint-disable no-bitwise */
import {base64ToBytes} from './base64';

/**
 * Parses the standard Heart Rate Measurement characteristic (0x2A37).
 * Byte 0 = flags (bit 0: 0 = uint8 value, 1 = uint16 value).
 */
export const parseHeartRate = (base64Value: string): number => {
  const data = base64ToBytes(base64Value);
  const is16Bit = (data[0] & 0x01) === 1;
  return is16Bit ? data[1] | (data[2] << 8) : data[1];
};
