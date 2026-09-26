import {HBandAdapter} from './HBandAdapter';

/**
 * E500 bracelet. Its device check report (2026-09-26) shows the Veepoo / H Band GATT
 * services (f0020001 / f0030001 / f0080001-0451-4000-b000-…), so it connects through
 * the H Band SDK like any H Band.
 */
export class E500Adapter extends HBandAdapter {}
