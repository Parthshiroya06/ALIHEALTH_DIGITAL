import {GenericBleAdapter} from './GenericBleAdapter';

/**
 * E500 bracelet (manufacturer and model to be confirmed).
 * Until its vendor SDK arrives it connects over standard BLE, so the device
 * check report still captures every service/characteristic it exposes.
 * TODO: wrap the vendor SDK in a native module (Kotlin + Swift) and call it here.
 */
export class E500Adapter extends GenericBleAdapter {}
