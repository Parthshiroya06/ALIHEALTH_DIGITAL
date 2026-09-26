import Foundation
import NitroModules

/// TODO: wrap VeepooBleSDK.framework (https://github.com/HBandSDK/iOS_Ble_SDK).
/// Until then the JS side does not create this object on iOS (see src/index.ts).
class HybridAliBandSdk: HybridAliBandSdkSpec {
  private func notImplemented<T>() -> Promise<T> {
    return Promise.rejected(withError: RuntimeError.error(withMessage: "AliBandSdk is not implemented on iOS yet"))
  }

  func connect(mac: String, password: String, profile: BandProfile) throws -> Promise<BandInfo> { notImplemented() }
  func disconnect() throws -> Promise<Void> { Promise.resolved() }
  func isConnected() throws -> Bool { false }
  func startMeasurement(type: MeasurementType) throws -> Promise<Void> { notImplemented() }
  func stopMeasurement(type: MeasurementType) throws -> Promise<Void> { notImplemented() }
  func readCurrentSteps() throws -> Promise<BandSteps> { notImplemented() }
  func readBattery() throws -> Promise<BandBattery> { notImplemented() }
  func syncHistory() throws -> Promise<[BandReading]> { notImplemented() }
  func getRawResponses() throws -> String { "{}" }
  func setOnMeasurement(listener: @escaping (_ event: BandMeasurement) -> Void) throws {}
  func setOnConnectionChange(listener: @escaping (_ connected: Bool) -> Void) throws {}
  func setOnSyncProgress(listener: @escaping (_ progress: Double) -> Void) throws {}
  func setOnLog(listener: @escaping (_ message: String) -> Void) throws {}
  func clearListeners() throws {}
}
