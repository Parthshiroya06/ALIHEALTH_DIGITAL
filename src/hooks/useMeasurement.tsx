import {useCallback, useEffect, useRef, useState} from 'react';
import {addDebugLog, getActiveAdapter} from '@services';
import {IMeasurementStatus, MeasurableMetric} from '@types';

/** Starts/stops on-demand measurements on the connected bracelet (one at a time). */
export const useMeasurement = () => {
  const [statuses, setStatuses] = useState<
    Partial<Record<MeasurableMetric, IMeasurementStatus>>
  >({});
  const [activeType, setActiveType] = useState<MeasurableMetric | null>(null);
  const activeRef = useRef<MeasurableMetric | null>(null);

  const setActive = (type: MeasurableMetric | null) => {
    activeRef.current = type;
    setActiveType(type);
  };

  const onStatus = useCallback((status: IMeasurementStatus) => {
    setStatuses(previous => ({...previous, [status.type]: status}));
    if (status.state !== 'measuring' && activeRef.current === status.type) {
      setActive(null);
      // Make sure the band is not left measuring after a wear/busy/battery error
      if (status.state !== 'done' && status.state !== 'stopped') {
        getActiveAdapter()
          ?.stopMeasurement?.(status.type)
          .catch(() => undefined);
      }
    }
  }, []);

  const stop = useCallback(async (type: MeasurableMetric) => {
    try {
      await getActiveAdapter()?.stopMeasurement?.(type);
    } finally {
      if (activeRef.current === type) {
        setActive(null);
      }
    }
  }, []);

  const start = useCallback(
    async (type: MeasurableMetric) => {
      const adapter = getActiveAdapter();
      if (!adapter?.startMeasurement || activeRef.current) {
        return;
      }
      setActive(type);
      try {
        await adapter.startMeasurement(type, onStatus);
      } catch (error: any) {
        addDebugLog(`measure ${type} failed: ${error?.message}`);
        onStatus({type, state: 'failed', progress: null, value: null});
      }
    },
    [onStatus],
  );

  // Leaving the screen stops the running measurement so the band is free again
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        getActiveAdapter()
          ?.stopMeasurement?.(activeRef.current)
          .catch(() => undefined);
      }
    };
  }, []);

  const canMeasure = !!getActiveAdapter()?.startMeasurement;
  return {statuses, activeType, canMeasure, start, stop};
};
