import Foundation
import NitroModules

#if ALIBAND_VEEPOO
import CoreBluetooth
import ObjectiveC.runtime
import VeepooBleSDK

/**
 * Nitro HybridObject around the H Band (Veepoo) iOS SDK – the iOS twin of the Android
 * HybridAliBandSdk.kt, used by the app's HBandAdapter.
 * The SDK keeps the band's history in its own database: syncHistory() reads the band
 * into it, then queries it day by day (table id = the band's MAC address).
 * Timestamps are epoch milliseconds; the adapter converts them to UTC ISO-8601.
 */
class HybridAliBandSdk: HybridAliBandSdkSpec {
  private static let connectTimeout: TimeInterval = 30
  private static let historyTimeout: TimeInterval = 240
  private static let historyStepTimeout: TimeInterval = 120
  private static let mmolToMgDl = 18.0182

  private var ble: VPBleCentralManage { VPBleCentralManage.sharedBleManager() }
  private var manage: VPPeripheralBaseManage { ble.peripheralManage }
  private var tableId: String?
  private var watchDays = 3

  // JS listeners
  private var onMeasurement: ((BandMeasurement) -> Void)?
  private var onConnectionChange: ((Bool) -> Void)?
  private var onSyncProgress: ((Double) -> Void)?
  private var onLog: ((String) -> Void)?

  // Raw band responses for the device check report (main thread only)
  private var rawConnect: [String: Any] = [:]
  private var historyFields: [String: (records: Int, fields: Set<String>)] = [:]
  // What the last history sync did, step by step (no health values)
  private var historyLog: [String] = []

  override init() {
    super.init()
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      // SDK persistence: history is read into the SDK database, then queried per day
      self.ble.peripheralManage = VPPeripheralManage.shareVPPeripheralManager()
      self.ble.isLogEnable = false
      self.ble.vpBleConnectStateChangeBlock = { [weak self] state in
        // 0 disconnected, 2 connected, 3 password verified
        switch state.rawValue {
        case 0: self?.log("connection status: disconnected"); self?.onConnectionChange?(false)
        case 3: self?.log("connection status: connected"); self?.onConnectionChange?(true)
        default: break
        }
      }
    }
  }

  func setOnMeasurement(listener: @escaping (_ event: BandMeasurement) -> Void) throws {
    onMeasurement = listener
  }

  func setOnConnectionChange(listener: @escaping (_ connected: Bool) -> Void) throws {
    onConnectionChange = listener
  }

  func setOnSyncProgress(listener: @escaping (_ progress: Double) -> Void) throws {
    onSyncProgress = listener
  }

  func setOnLog(listener: @escaping (_ message: String) -> Void) throws {
    onLog = listener
  }

  func clearListeners() throws {
    onMeasurement = nil
    onConnectionChange = nil
    onSyncProgress = nil
    onLog = nil
  }

  // MARK: - Connection

  /// `mac` is the CoreBluetooth identifier on iOS (what the app's BLE scan returns).
  func connect(mac: String, password: String, profile: BandProfile) throws -> Promise<BandInfo> {
    let promise = Promise<BandInfo>()
    let once = Once(promise)
    DispatchQueue.main.async { [self] in
      guard let uuid = UUID(uuidString: mac),
            let peripheral = ble.centralManager.retrievePeripherals(withIdentifiers: [uuid]).first
      else {
        once.reject("Bracelet not found – scan again and retry")
        return
      }
      rawConnect = [:]
      let timeout = DispatchWorkItem { once.reject("Connection timed out") }
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.connectTimeout, execute: timeout)
      let fail = { (message: String) in
        timeout.cancel()
        once.reject(message)
      }

      log("connecting")
      ble.deviceShowConfirm = false
      // The SDK sends the password ("0000" by default) itself once the services are found
      ble.veepooSDKSelfScanConnectDevice(peripheral) { [weak self] state in
        guard let self else { return }
        switch state.rawValue {
        case 0: fail("Bluetooth is off")
        case 3: fail("Connection failed")
        case 4: self.didVerifyPassword(profile: profile, once: once, timeout: timeout)
        case 5: fail("Password check failed")
        case 6: fail("The bracelet was not found nearby")
        case 7: fail("The bracelet did not confirm the connection")
        default: break
        }
      }
    }
    return promise
  }

  private func didVerifyPassword(profile: BandProfile, once: Once<BandInfo>, timeout: DispatchWorkItem) {
    guard let model = ble.peripheralModel else {
      timeout.cancel()
      once.reject("The bracelet did not send its details")
      return
    }
    tableId = model.deviceAddress
    watchDays = max(Int(model.saveDays), 1)
    putRaw("peripheralModel", model)
    let info = BandInfo(
      deviceNumber: Double(model.deviceNumber),
      firmwareVersion: model.deviceVersion ?? "",
      watchDays: Double(watchDays),
      capabilities: capabilities(model),
      features: features(model)
    )
    syncPersonInfo(profile) {
      timeout.cancel()
      once.resolve(info)
    }
  }

  /// Height/weight/age are used by the band for calories, distance and BP.
  private func syncPersonInfo(_ profile: BandProfile, onDone: @escaping () -> Void) {
    let done = OnceAction(onDone)
    let info = VPSyncPersonalInfo()
    info.status = Int32(profile.heightCm) // the SDK names height "status"
    info.weight = Int32(profile.weightKg)
    info.age = Int32(profile.age)
    info.sex = profile.female ? 0 : 1
    info.targetStep = Int32(profile.stepGoal)
    info.targetSleepDuration = 480
    manage.veepooSDKSynchronousPersonalInformation(info) { [weak self] result in
      self?.log("syncPersonInfo: \(result == 1 ? "ok" : "failed")")
      done.run()
    }
    // Some firmwares never answer: do not block the connection on it
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { done.run() }
  }

  private func capabilities(_ model: VPPeripheralModel) -> [String] {
    let functions = [UInt8](model.deviceFuctionData ?? Data())
    func byte(_ index: Int) -> UInt8 { index < functions.count ? functions[index] : 0 }
    var result = ["steps", "sleep_session"]
    // Byte 18: 1 = no heart rate (inverted flag)
    if byte(18) != 1 { result.insert("heart_rate", at: 0) }
    if model.oxygenType != 0 { result.append("spo2") }
    if byte(1) != 0 { result.append("blood_pressure") }
    if model.temperatureType != 0 { result.append("temperature") }
    if model.ecgType != 0 { result.append("ecg") }
    // 3 = calibration only
    if [1, 2, 4, 5, 6, 7].contains(Int(model.bloodGlucoseType)) { result.append("glucose") }
    return result
  }

  /// Everything health-related the band reports about itself (for the device check report).
  private func features(_ model: VPPeripheralModel) -> [String: String] {
    [
      "bloodPressure": "\(byteAt(model.deviceFuctionData, 1))",
      "heartRateMissing": "\(byteAt(model.deviceFuctionData, 18))",
      "oxygenType": "\(model.oxygenType)",
      "oxygenAutoDetectType": "\(model.oxygenAutoDetectType)",
      "hrvType": "\(model.hrvType)",
      "sleepType": "\(model.sleepType)",
      "ecgType": "\(model.ecgType)",
      "temperatureType": "\(model.temperatureType)",
      "bloodGlucoseType": "\(model.bloodGlucoseType)",
      "bloodAnalysisType": "\(model.bloodAnalysisType)",
      "bodyCompositionType": "\(model.bodyCompositionType)",
      "bloodPressureType": "\(model.bloodPressureType)",
      "heartRateType": "\(model.heartRateType)",
      "bloodOxygenType": "\(model.bloodOxygenType)",
      "resRateType": "\(model.resRateType)",
      "fiveProtocolType": "\(model.fiveProtocolType)",
      "cpuType": "\(model.cpuType)",
      "watchDays": "\(model.saveDays)",
    ]
  }

  func disconnect() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async { [self] in
      tableId = nil
      ble.veepooSDKDisconnectDevice()
      promise.resolve()
    }
    return promise
  }

  func isConnected() throws -> Bool {
    tableId != nil && ble.isConnected
  }

  // MARK: - Manual measurements

  func startMeasurement(type: MeasurementType) throws -> Promise<Void> {
    run(type, start: true)
  }

  func stopMeasurement(type: MeasurementType) throws -> Promise<Void> {
    run(type, start: false)
  }

  private func run(_ type: MeasurementType, start: Bool) -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async { [self] in
      guard ble.isConnected else {
        promise.reject(withError: RuntimeError.error(withMessage: "The bracelet is not connected"))
        return
      }
      switch type {
      case .heartRate:
        manage.veepooSDKTestHeartStart(start) { [weak self] state, value in
          self?.heartChanged(state.rawValue, Int(value))
        }
      case .spo2:
        manage.veepooSDKTestOxygenStart(start) { [weak self] state, value in
          self?.oxygenChanged(state.rawValue, Int(value))
        }
      case .bloodPressure:
        manage.veepooSDKTestBloodStart(start, testMode: 0) { [weak self] state, progress, high, low in
          self?.bloodPressureChanged(state.rawValue, Int(progress), Int(high), Int(low))
        }
      case .temperature:
        manage.veepooSDK_temperatureTestStart(start) { [weak self] state, _, progress, value, _ in
          self?.temperatureChanged(Int(state.rawValue), progress, value)
        }
      case .glucose:
        manage.veepooSDKTestBloodGlucoseStart(start, isPersonalModel: false) { [weak self] state, progress, value, _ in
          self?.glucoseChanged(Int(state.rawValue), Int(progress), Int(value))
        }
      case .ecg:
        manage.veepooSDKTestECGStart(start) { [weak self] state, progress, model in
          self?.ecgChanged(state.rawValue, Int(progress), model)
        }
      }
      promise.resolve()
    }
    return promise
  }

  // 0 start, 1 testing, 2 not worn, 3 busy, 4 stopped
  private func heartChanged(_ state: Int, _ value: Int) {
    let name = ["STARTING", "MEASURING", "NOT_WEAR", "DEVICE_BUSY", "STOPPED"][safe: state] ?? "UNKNOWN"
    emit(.heartRate, name, value: value > 0 ? Double(value) : nil)
  }

  // 0 start, 1 testing, 2 not worn, 3 busy, 4 stopped, 5 no function, 6/7 calibrating, 8 invalid
  private func oxygenChanged(_ state: Int, _ value: Int) {
    let names = ["STARTING", "MEASURING", "NOT_WEAR", "DEVICE_BUSY", "STOPPED", "NOT_SUPPORTED",
                 "CALIBRATING", "CALIBRATING", "ERROR"]
    emit(.spo2, names[safe: state] ?? "UNKNOWN", value: (1...100).contains(value) ? Double(value) : nil)
  }

  // 0 testing, 1 busy, 2 failed, 3 stopped, 4 complete, 5 no function
  private func bloodPressureChanged(_ state: Int, _ progress: Int, _ high: Int, _ low: Int) {
    if state == 4 && high > 0 {
      // Some firmwares swap the two values: the higher one is systolic
      emit(.bloodPressure, "DONE", progress: 100, values: [
        "systolic": Double(max(high, low)),
        "diastolic": Double(min(high, low)),
      ], done: true)
      return
    }
    let names = ["MEASURING", "DEVICE_BUSY", "ERROR", "STOPPED", "ERROR", "NOT_SUPPORTED"]
    emit(.bloodPressure, names[safe: state] ?? "UNKNOWN", progress: progress, error: state == 2 || state == 4)
  }

  // 0 unsupported, 1 measuring, 2 stopped, 9 not worn; value = °C × 10
  private func temperatureChanged(_ state: Int, _ progress: Int, _ value: Int) {
    switch state {
    case 0: emit(.temperature, "NOT_SUPPORTED")
    case 2: emit(.temperature, "STOPPED")
    case 9: emit(.temperature, "NOT_WEAR")
    default:
      let done = progress >= 100 && value > 0
      emit(.temperature, done ? "DONE" : "MEASURING", progress: progress,
           value: done ? Double(value) / 10 : nil, done: done)
    }
  }

  // 0 unsupported, 1 measuring, 2 stopped, 3 low battery, 4 busy, 5 not worn; value = mmol/L × 100
  private func glucoseChanged(_ state: Int, _ progress: Int, _ value: Int) {
    guard state == 1 else {
      let names = ["NOT_SUPPORTED", "MEASURING", "STOPPED", "LOW_BATTERY", "DEVICE_BUSY", "NOT_WEAR"]
      emit(.glucose, names[safe: state] ?? "UNKNOWN")
      return
    }
    let done = progress >= 100 && value > 0
    emit(.glucose, done ? "DONE" : "MEASURING", progress: progress,
         value: done ? (Double(value) / 100 * Self.mmolToMgDl).rounded() : nil, done: done)
  }

  // 0 start, 1 testing, 2 lead off, 3 busy, 4 stopped, 5 failed, 6 complete, 7 no function
  private func ecgChanged(_ state: Int, _ progress: Int, _ model: VPECGTestDataModel?) {
    if state == 6, let model {
      // Band time, so the same record read later from the history gets the same clientId
      let time = ecgTimestamp(model) ?? nowMs()
      emit(.ecg, "DONE", progress: 100, values: ecgSummary(model), done: true,
           timestamp: time, file: saveEcgWaveform(model, time: time))
      return
    }
    let names = ["STARTING", "MEASURING", "NOT_WEAR_LEAD_OFF", "DEVICE_BUSY", "STOPPED", "FAILED", "DONE",
                 "NOT_SUPPORTED"]
    let heart = Double(model?.aveHeart ?? "") ?? 0
    emit(.ecg, names[safe: state] ?? "UNKNOWN", progress: progress, value: heart > 0 ? heart : nil,
         error: state == 5)
  }

  // MARK: - Reads

  func readCurrentSteps() throws -> Promise<BandSteps> {
    let promise = Promise<BandSteps>()
    let once = Once(promise)
    DispatchQueue.main.async { [self] in
      guard let tableId else {
        once.reject("The bracelet is not connected")
        return
      }
      let height = ble.peripheralModel?.deviceStature ?? 175
      VPDataBaseOperation.veepooSDKGetStepData(withDate: dayString(0), andTableID: tableId,
                                               changeUserStature: height) { dict in
        once.resolve(BandSteps(
          timestamp: nowMs(),
          steps: number(dict?["Step"]),
          distanceM: number(dict?["Dis"]) * 1000,
          kcal: number(dict?["Cal"])
        ))
      }
    }
    return promise
  }

  func readBattery() throws -> Promise<BandBattery> {
    let promise = Promise<BandBattery>()
    let once = Once(promise)
    DispatchQueue.main.async { [self] in
      manage.veepooSDKReadDeviceBatteryInfo { isPercent, isLow, battery in
        once.resolve(BandBattery(
          isPercent: isPercent,
          percent: isPercent ? Double(battery) : 0,
          level: isPercent ? 0 : Double(battery),
          isLow: isLow
        ))
      }
    }
    return promise
  }

  /**
   * Reads the band into the SDK database (daily data, then temperature on bands that store
   * it separately), then queries every stored day. Each read step has its own timeout.
   */
  func syncHistory() throws -> Promise<[BandReading]> {
    let promise = Promise<[BandReading]>()
    let once = Once(promise)
    DispatchQueue.main.async { [self] in
      guard let tableId, let model = ble.peripheralModel else {
        once.reject("The bracelet is not connected")
        return
      }
      historyFields = [:]
      historyLog = []
      let giveUp = DispatchWorkItem { [weak self] in
        self?.log("history: timed out, returning what was read")
        let readings = self?.queryHistory(tableId: tableId, model: model) ?? []
        self?.noteHistory("stopped after \(Int(Self.historyTimeout)) s: \(readings.count) readings")
        once.resolve(readings)
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + Self.historyTimeout, execute: giveUp)

      // temperatureType 5 is read with the daily data; 1/2/4 have their own store
      let separateTemperature = [1, 2, 4].contains(Int(model.temperatureType))
      var steps: [HistoryStep] = [HistoryStep(name: "daily data") { progress, next in
        self.manage.veepooSdkStartReadDeviceAllData { state, totalDay, dayNumber, dayProgress in
          if totalDay > 0 {
            progress((Double(dayNumber) + Double(dayProgress) / 100) / Double(totalDay))
          }
          if state.rawValue >= 3 { next() } // complete / not available
        }
      }]
      if separateTemperature {
        steps.append(HistoryStep(name: "temperature") { progress, next in
          self.manage.veepooSdkStartReadDeviceTemperatureData { state, totalDay, dayNumber, dayProgress in
            if totalDay > 0 {
              progress((Double(dayNumber) + Double(dayProgress) / 100) / Double(totalDay))
            }
            if state.rawValue >= 3 { next() }
          }
        })
      }
      noteHistory("sleepType \(model.sleepType), temperatureType \(model.temperatureType), \(watchDays) days, "
        + "steps: \(steps.map(\.name).joined(separator: ", "))")
      runSteps(steps, index: 0) { [weak self] in
        giveUp.cancel()
        let readings = self?.queryHistory(tableId: tableId, model: model) ?? []
        self?.noteHistory("finished: \(readings.count) readings")
        self?.log("history: \(readings.count) readings")
        once.resolve(readings)
      }
    }
    return promise
  }

  private struct HistoryStep {
    let name: String
    let run: (_ progress: @escaping (Double) -> Void, _ next: @escaping () -> Void) -> Void
  }

  private func runSteps(_ steps: [HistoryStep], index: Int, onDone: @escaping () -> Void) {
    guard index < steps.count else {
      onDone()
      return
    }
    let step = steps[index]
    let startedAt = Date()
    let advance = OnceAction { [weak self] in
      DispatchQueue.main.async { self?.runSteps(steps, index: index + 1, onDone: onDone) }
    }
    let timeout = DispatchWorkItem { [weak self] in
      self?.noteHistory("step '\(step.name)': timed out after \(Int(Self.historyStepTimeout)) s")
      self?.log("history step '\(step.name)' timed out")
      advance.run()
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.historyStepTimeout, execute: timeout)
    log("history step '\(step.name)'")
    step.run({ [weak self] value in
      self?.onSyncProgress?((Double(index) + min(max(value, 0), 1)) / Double(steps.count))
    }, { [weak self] in
      timeout.cancel()
      self?.noteHistory("step '\(step.name)': done in \(Int(Date().timeIntervalSince(startedAt))) s")
      advance.run()
    })
  }

  /// Queries the SDK database for every stored day (today first).
  private func queryHistory(tableId: String, model: VPPeripheralModel) -> [BandReading] {
    var readings: [BandReading] = []
    var seenSleep = Set<Double>()
    let accurateSleep = [1, 3].contains(Int(model.sleepType))
    for day in 0..<watchDays {
      let date = dayString(day)

      // Sleep (a night can show up under two dates: keep one)
      if accurateSleep {
        for sleep in VPDataBaseOperation.veepooSDKGetAccurateSleepData(withDate: date, andTableID: tableId) ?? [] {
          recordFields("VPAccurateSleepModel", sleep)
          guard let start = parseDate(sleep.sleepTime), seenSleep.insert(start).inserted else { continue }
          var values: [String: Double] = [
            "durationMinutes": number(sleep.sleepDuration),
            "deepMinutes": number(sleep.deepDuration),
            "lightMinutes": number(sleep.lightDuration),
            "wakeCount": number(sleep.getUpTimes),
            "quality": number(sleep.sleepQuality),
          ]
          if let end = parseDate(sleep.wakeTime) { values["endTimestamp"] = end }
          readings.append(reading("sleep_session", "min", start, values: values))
        }
      } else {
        for case let sleep as [String: Any] in VPDataBaseOperation.veepooSDKGetSleepData(withDate: date, andTableID: tableId) ?? [] {
          recordFields("SleepData", sleep)
          guard let start = parseDate(sleep["SLEEP_TIME"]), seenSleep.insert(start).inserted else { continue }
          let total = number(sleep["SLE_HOUR"]) * 60 + number(sleep["SLE_MINUTE"])
          var values: [String: Double] = [
            "durationMinutes": total,
            "deepMinutes": (number(sleep["DEEP_HOUR"]) * 60).rounded(),
            "lightMinutes": (number(sleep["LIGHT_HOUR"]) * 60).rounded(),
            "wakeCount": number(sleep["WakeUpTime"]),
            "quality": number(sleep["SLEEP_LEVEL"]),
          ]
          if let end = parseDate(sleep["WAKE_TIME"]) { values["endTimestamp"] = end }
          readings.append(reading("sleep_session", "min", start, values: values))
        }
      }

      // 30-min heart rate + steps
      for case let (time as String, item as [String: Any]) in
        VPDataBaseOperation.veepooSDKGetOriginalChangeHalfHourData(withDate: date, andTableID: tableId) ?? [:] {
        recordFields("HalfHourData", item)
        guard let at = timestamp(date, time) else { continue }
        let heart = number(item["heartValue"])
        if heart > 0 { readings.append(reading("heart_rate", "bpm", at, value: heart)) }
        let stepCount = number(item["stepValue"])
        if stepCount > 0 {
          readings.append(reading("steps", "steps", at, values: [
            "count": stepCount,
            "distanceM": number(item["disValue"]) * 1000,
            "kcal": number(item["calValue"]),
          ]))
        }
      }

      // 5-min raw data: field coverage only (HR/steps come from the 30-min summary)
      for case let item as [String: Any] in (VPDataBaseOperation.veepooSDKGetOriginalData(withDate: date, andTableID: tableId) ?? [:]).values {
        recordFields("OriginalData", item)
      }

      // Blood pressure
      for case let item as [String: Any] in VPDataBaseOperation.veepooSDKGetBloodData(withDate: date, andTableID: tableId) ?? [] {
        recordFields("BloodPressureData", item)
        let high = number(item["systolic"]), low = number(item["diastolic"])
        guard max(high, low) > 0, let at = timestamp(date, item["Time"]) else { continue }
        readings.append(reading("blood_pressure", "mmHg", at, values: [
          "systolic": max(high, low),
          "diastolic": min(high, low),
        ]))
      }

      // SpO2
      for case let item as [String: Any] in VPDataBaseOperation.veepooSDKGetDeviceOxygenData(withDate: date, andTableID: tableId) ?? [] {
        recordFields("OxygenData", item)
        let oxygen = number(item["OxygenValue"])
        guard (1...100).contains(oxygen), let at = timestamp(date, item["Time"]) else { continue }
        readings.append(reading("spo2", "%", at, value: oxygen))
      }

      // Temperature (5-min)
      for case let item as [String: Any] in VPDataBaseOperation.veepooSDKGetDeviceTemperatureData(withDate: date, andTableID: tableId) ?? [] {
        recordFields("TemperatureData", item)
        // Keys from VPDataBaseOperation.h (VPDeviceTemperatrueData*Key, not importable in Swift)
        let value = number(item["value"])
        let hour = Int(number(item["hour"]))
        let minute = Int(number(item["minute"]))
        guard value > 0, let at = timestamp(date, String(format: "%02d:%02d", hour, minute)) else { continue }
        readings.append(reading("temperature", "°C", at, value: value))
      }

      // Glucose: up to 5 values per 5-min slot (mmol/L)
      for case let item as [String: Any] in VPDataBaseOperation.veepooSDKGetDeviceBloodGlucoseData(withDate: date, andTableID: tableId) ?? [] {
        recordFields("BloodGlucoseData", item)
        guard let at = timestamp(date, item["time"]) else { continue }
        for (index, raw) in ((item["bloodGlucoses"] as? [Any]) ?? []).enumerated() {
          let mmol = number(raw)
          if mmol > 0 {
            readings.append(reading("glucose", "mg/dL", at + Double(index) * 60_000,
                                    value: (mmol * Self.mmolToMgDl).rounded()))
          }
        }
      }

      // ECG records stored on the band, each with its waveform file
      for ecg in VPDataBaseOperation.veepooSDKGetDeviceOffStoreECG(withDate: date, andTableID: tableId) ?? [] {
        recordFields("VPECGTestDataModel", ecg)
        guard let at = ecgTimestamp(ecg) else { continue }
        readings.append(reading("ecg", "bpm", at, values: ecgSummary(ecg), file: saveEcgWaveform(ecg, time: at)))
      }
    }
    return readings
  }

  // MARK: - ECG

  private func ecgSummary(_ model: VPECGTestDataModel) -> [String: Double] {
    [
      "heartRate": number(model.aveHeart),
      "hrv": number(model.aveHrv),
      "qt": number(model.aveQT),
      "respiratoryRate": number(model.aveResRate),
      "durationSec": number(model.duration),
      "sampleRate": number(model.frequency),
      "sampleCount": Double(model.filterSignals?.count ?? 0),
    ]
  }

  private func ecgTimestamp(_ model: VPECGTestDataModel) -> Double? {
    let date = model.date ?? ""
    let time = model.testTime ?? ""
    return parseDate("\(date) \(time)") ?? parseDate(time)
  }

  /// Saves the ECG waveform in app-private storage (the API takes a file reference,
  /// not inline samples). Same record => same file name, so a re-read overwrites it.
  private func saveEcgWaveform(_ model: VPECGTestDataModel, time: Double) -> String? {
    let filtered = (model.filterSignals ?? []).map { Int(number($0)) }
    let raw = (model.originalSignals ?? []).map { Int(number($0)) }
    if filtered.isEmpty && raw.isEmpty { return nil }
    do {
      let dir = try FileManager.default
        .url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        .appendingPathComponent("ecg", isDirectory: true)
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let file = dir.appendingPathComponent("ecg_\(Int64(time)).json")
      var json: [String: Any] = [
        "timestamp": Int64(time),
        "sampleRate": number(model.frequency),
        "durationSec": number(model.duration),
      ]
      if !filtered.isEmpty { json["samples"] = filtered }
      if !raw.isEmpty { json["rawSamples"] = raw }
      try JSONSerialization.data(withJSONObject: json).write(to: file, options: .atomic)
      return file.path
    } catch {
      log("ECG waveform not saved (\(type(of: error)))")
      return nil
    }
  }

  // MARK: - Raw responses (device check report)

  func getRawResponses() throws -> String {
    let fields = historyFields.mapValues { ["records": $0.records, "fieldsWithData": $0.fields.sorted()] }
    let json: [String: Any] = ["connect": rawConnect, "historyFields": fields, "historyLog": historyLog]
    guard let data = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys])
    else { return "{}" }
    return String(decoding: data, as: UTF8.self)
  }

  private func noteHistory(_ message: String) {
    if historyLog.count < 60 { historyLog.append(message) }
  }

  /// Device configuration: every property (passwords masked). No health values here.
  private func putRaw(_ key: String, _ object: NSObject) {
    var json: [String: Any] = [:]
    for name in propertyNames(of: type(of: object)) {
      if Self.unreadableProperties.contains(name) { continue }
      if name.localizedCaseInsensitiveContains("password") || name.localizedCaseInsensitiveContains("pwd") {
        json[name] = "***"
        continue
      }
      guard let value = object.value(forKey: name) else { continue }
      json[name] = jsonValue(value)
    }
    rawConnect[key] = json
  }

  /// Health records: counts which fields carry data, never the values themselves.
  private func recordFields(_ kind: String, _ record: Any) {
    var filled: [String] = []
    if let dict = record as? [String: Any] {
      filled = dict.filter { hasData($0.value) }.map(\.key)
    } else if let object = record as? NSObject {
      filled = propertyNames(of: type(of: object)).filter {
        !Self.unreadableProperties.contains($0) && hasData(object.value(forKey: $0))
      }
    }
    var coverage = historyFields[kind] ?? (records: 0, fields: [])
    coverage.records += 1
    coverage.fields.formUnion(filled)
    historyFields[kind] = coverage
  }

  // `assign` object pointers or internal handles: reading them can crash
  private static let unreadableProperties: Set<String> = ["reportData", "peripheral", "hash", "superclass",
                                                          "description", "debugDescription"]

  private func propertyNames(of type: AnyClass) -> [String] {
    var names: [String] = []
    var current: AnyClass? = type
    while let cls = current, cls != NSObject.self {
      var count: UInt32 = 0
      if let list = class_copyPropertyList(cls, &count) {
        for index in 0..<Int(count) {
          names.append(String(cString: property_getName(list[index])))
        }
        free(list)
      }
      current = class_getSuperclass(cls)
    }
    return Array(Set(names)).sorted()
  }

  private func jsonValue(_ value: Any) -> Any {
    switch value {
    case let number as NSNumber: return number
    case let string as String: return string
    case let data as Data: return data.map { String(format: "%02x", $0) }.joined()
    case let array as [Any]: return "\(array.count) items"
    case let dict as [AnyHashable: Any]: return "\(dict.count) items"
    default: return String(describing: value)
    }
  }

  private func hasData(_ value: Any?) -> Bool {
    switch value {
    case nil: return false
    case let number as NSNumber: return number.doubleValue != 0
    case let string as String: return !string.isEmpty && Double(string) != 0
    case let array as [Any]: return !array.isEmpty
    case let dict as [AnyHashable: Any]: return !dict.isEmpty
    case let data as Data: return !data.isEmpty
    default: return true
    }
  }

  // MARK: - Helpers

  private func emit(
    _ type: MeasurementType,
    _ state: String,
    progress: Int = -1,
    value: Double? = nil,
    values: [String: Double]? = nil,
    done: Bool = false,
    error: Bool = false,
    timestamp: Double? = nil,
    file: String? = nil
  ) {
    onMeasurement?(BandMeasurement(
      type: type,
      state: state,
      progress: Double(progress),
      value: value,
      values: values,
      done: done,
      error: error,
      timestamp: timestamp ?? nowMs(),
      file: file
    ))
  }

  private func reading(
    _ type: String,
    _ unit: String,
    _ timestamp: Double,
    value: Double? = nil,
    values: [String: Double]? = nil,
    file: String? = nil
  ) -> BandReading {
    BandReading(type: type, unit: unit, timestamp: timestamp, value: value, values: values, file: file)
  }

  /// The SDK database is keyed by the band's local date (the phone's time zone).
  private func dayString(_ daysAgo: Int) -> String {
    let date = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
    return Self.dayFormatter.string(from: date)
  }

  private func timestamp(_ day: String, _ time: Any?) -> Double? {
    guard let time = time as? String, !time.isEmpty else { return nil }
    return parseDate("\(day) \(time)")
  }

  private func parseDate(_ value: Any?) -> Double? {
    guard let text = (value as? String)?.trimmingCharacters(in: .whitespaces), !text.isEmpty else { return nil }
    for formatter in Self.dateFormatters {
      if let date = formatter.date(from: text) { return date.timeIntervalSince1970 * 1000 }
    }
    return nil
  }

  private static let dayFormatter = makeFormatter("yyyy-MM-dd")
  private static let dateFormatters = [
    "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy/MM/dd HH:mm:ss", "yyyy/MM/dd HH:mm",
  ].map(makeFormatter)

  private static func makeFormatter(_ format: String) -> DateFormatter {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = format
    return formatter
  }

  private func byteAt(_ data: Data?, _ index: Int) -> UInt8 {
    guard let data, index < data.count else { return 0 }
    return data[data.startIndex + index]
  }

  /// Debug builds only – never logs health values or tokens.
  private func log(_ message: String) {
    #if DEBUG
    NSLog("[AliBandSdk] %@", message)
    onLog?(message)
    #endif
  }
}

// MARK: - Small helpers

private func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }

/// The SDK returns numbers as NSNumber or String ("80.00").
private func number(_ value: Any?) -> Double {
  switch value {
  case let number as NSNumber: return number.doubleValue
  case let string as String: return Double(string.trimmingCharacters(in: .whitespaces)) ?? 0
  default: return 0
  }
}

private extension Array {
  subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}

/// The SDK can call back more than once; a promise must settle only once.
private final class Once<T> {
  private let promise: Promise<T>
  private var settled = false
  private let lock = NSLock()

  init(_ promise: Promise<T>) { self.promise = promise }

  private func settle() -> Bool {
    lock.lock(); defer { lock.unlock() }
    if settled { return false }
    settled = true
    return true
  }

  func resolve(_ value: T) {
    if settle() { promise.resolve(withResult: value) }
  }

  func reject(_ message: String) {
    if settle() { promise.reject(withError: RuntimeError.error(withMessage: message)) }
  }
}

private final class OnceAction {
  private var action: (() -> Void)?
  private let lock = NSLock()

  init(_ action: @escaping () -> Void) { self.action = action }

  func run() {
    lock.lock()
    let pending = action
    action = nil
    lock.unlock()
    pending?()
  }
}

#else

/// Simulator builds, or the iOS SDK not downloaded (`yarn sdk:hband:ios`): the H Band
/// frameworks are iPhone-only, so the H Band connection needs a real iPhone.
class HybridAliBandSdk: HybridAliBandSdkSpec {
  private func notAvailable<T>() -> Promise<T> {
    Promise.rejected(withError: RuntimeError.error(
      withMessage: "The H Band connection needs a real iPhone (the bracelet SDK has no simulator version)"))
  }

  func connect(mac: String, password: String, profile: BandProfile) throws -> Promise<BandInfo> { notAvailable() }
  func disconnect() throws -> Promise<Void> { Promise.resolved() }
  func isConnected() throws -> Bool { false }
  func startMeasurement(type: MeasurementType) throws -> Promise<Void> { notAvailable() }
  func stopMeasurement(type: MeasurementType) throws -> Promise<Void> { notAvailable() }
  func readCurrentSteps() throws -> Promise<BandSteps> { notAvailable() }
  func readBattery() throws -> Promise<BandBattery> { notAvailable() }
  func syncHistory() throws -> Promise<[BandReading]> { notAvailable() }
  func getRawResponses() throws -> String { "{}" }
  func setOnMeasurement(listener: @escaping (_ event: BandMeasurement) -> Void) throws {}
  func setOnConnectionChange(listener: @escaping (_ connected: Bool) -> Void) throws {}
  func setOnSyncProgress(listener: @escaping (_ progress: Double) -> Void) throws {}
  func setOnLog(listener: @escaping (_ message: String) -> Void) throws {}
  func clearListeners() throws {}
}

#endif
