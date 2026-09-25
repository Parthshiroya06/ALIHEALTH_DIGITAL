import {IHealthReading, MetricType} from '@types';

/** Display value for a metric, e.g. 72, "121/79", "7h 32m". */
export const formatMetricValue = (
  type: MetricType,
  value?: number | Record<string, number> | null,
) => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Math.round(value * 10) / 10;
  }
  switch (type) {
    case 'blood_pressure':
      return `${value.systolic}/${value.diastolic}`;
    case 'steps':
      return value.count;
    case 'sleep_session': {
      const minutes = value.durationMinutes ?? 0;
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    case 'ecg':
      return value.heartRate;
    default:
      return Object.values(value).join(' / ');
  }
};

/** Display value for a reading, e.g. 72, "121/79". */
export const formatReadingValue = (reading?: IHealthReading) =>
  reading ? formatMetricValue(reading.type, reading.value) : null;

/** Unit shown next to the value (sleep is already formatted as "7h 32m"). */
export const formatMetricUnit = (type: MetricType, unit?: string) =>
  type === 'sleep_session' ? undefined : unit;
