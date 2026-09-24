import {IHealthReading} from '@types';

/** Display value for a reading, e.g. 72, "121/79". */
export const formatReadingValue = (reading?: IHealthReading) => {
  if (!reading) {
    return null;
  }
  if (typeof reading.value === 'number') {
    return reading.value;
  }
  if (reading.type === 'blood_pressure') {
    return `${reading.value.systolic}/${reading.value.diastolic}`;
  }
  return Object.values(reading.value).join(' / ');
};
