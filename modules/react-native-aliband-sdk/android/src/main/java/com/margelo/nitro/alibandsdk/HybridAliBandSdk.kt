package com.margelo.nitro.alibandsdk

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.inuker.bluetooth.library.Code
import com.inuker.bluetooth.library.Constants
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.veepoo.protocol.VPOperateManager
import com.veepoo.protocol.listener.base.IABleConnectStatusListener
import com.veepoo.protocol.listener.base.IBleWriteResponse
import com.veepoo.protocol.listener.base.IConnectResponse
import com.veepoo.protocol.listener.base.INotifyResponse
import com.veepoo.protocol.listener.data.IAllHealthDataListener
import com.veepoo.protocol.listener.data.IBPDetectDataListener
import com.veepoo.protocol.listener.data.IBloodGlucoseChangeListener
import com.veepoo.protocol.listener.data.ICustomSettingDataListener
import com.veepoo.protocol.listener.data.IDeviceFuctionDataListener
import com.veepoo.protocol.listener.data.IECGReadDataListener
import com.veepoo.protocol.listener.data.IECGDetectListener
import com.veepoo.protocol.listener.data.IHeartDataListener
import com.veepoo.protocol.listener.data.IOriginData3Listener
import com.veepoo.protocol.listener.data.IPersonInfoDataListener
import com.veepoo.protocol.listener.data.IPwdDataListener
import com.veepoo.protocol.listener.data.ISleepDataListener
import com.veepoo.protocol.listener.data.ISocialMsgDataListener
import com.veepoo.protocol.listener.data.ISpo2hDataListener
import com.veepoo.protocol.listener.data.ISpo2hOriginDataListener
import com.veepoo.protocol.listener.data.ITemptureDetectDataListener
import com.veepoo.protocol.model.datas.DeviceFunctionPackage1
import com.veepoo.protocol.model.datas.DeviceFunctionPackage2
import com.veepoo.protocol.model.datas.DeviceFunctionPackage3
import com.veepoo.protocol.model.datas.DeviceFunctionPackage4
import com.veepoo.protocol.model.datas.DeviceFunctionPackage5
import com.veepoo.protocol.model.datas.EcgDetectInfo
import com.veepoo.protocol.model.datas.EcgDetectResult
import com.veepoo.protocol.model.datas.EcgDetectState
import com.veepoo.protocol.model.datas.EcgDiagnosis
import com.veepoo.protocol.model.datas.FunctionDeviceSupportData
import com.veepoo.protocol.model.datas.FunctionSocailMsgData
import com.veepoo.protocol.model.datas.HRVOriginData
import com.veepoo.protocol.model.datas.MealInfo
import com.veepoo.protocol.model.datas.OriginData
import com.veepoo.protocol.model.datas.OriginData3
import com.veepoo.protocol.model.datas.OriginHalfHourData
import com.veepoo.protocol.model.datas.PersonInfoData
import com.veepoo.protocol.model.datas.PwdData
import com.veepoo.protocol.model.datas.SleepData
import com.veepoo.protocol.model.datas.Spo2hData
import com.veepoo.protocol.model.datas.Spo2hOriginData
import com.veepoo.protocol.model.datas.TemptureDetectData
import com.veepoo.protocol.model.datas.TimeData
import com.veepoo.protocol.model.enums.EBPDetectModel
import com.veepoo.protocol.model.enums.EBloodGlucoseRiskLevel
import com.veepoo.protocol.model.enums.EBloodGlucoseStatus
import com.veepoo.protocol.model.enums.EEcgDataType
import com.veepoo.protocol.model.enums.EFunctionStatus
import com.veepoo.protocol.model.enums.EOprateStauts
import com.veepoo.protocol.model.enums.EPwdStatus
import com.veepoo.protocol.model.enums.ESex
import com.veepoo.protocol.model.settings.CustomSettingData
import com.veepoo.protocol.shareprence.VpSpGetUtil
import java.io.File
import java.lang.reflect.Method
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * Nitro HybridObject around the H Band (Veepoo) SDK, used by the app's HBandAdapter.
 * The SDK runs one command at a time, so the JS adapter serialises the calls.
 * Timestamps are epoch milliseconds; the adapter converts them to UTC ISO-8601.
 */
class HybridAliBandSdk : HybridAliBandSdkSpec() {

  companion object {
    private const val TAG = "AliBandSdk"
    private const val CONNECT_TIMEOUT_MS = 30_000L
    private const val HISTORY_TIMEOUT_MS = 240_000L
    private const val HISTORY_STEP_TIMEOUT_MS = 90_000L
    // The band sends its function list several times, the first one incomplete
    private const val FUNCTIONS_SETTLE_MS = 1_500L
    private const val MMOL_TO_MG_DL = 18.0182
  }

  private val context by lazy {
    NitroModules.applicationContext?.applicationContext ?: throw Error("No Android context available")
  }
  private val manager: VPOperateManager by lazy {
    VPOperateManager.getInstance().apply { init(context) }
  }
  private val mainHandler = Handler(Looper.getMainLooper())
  private var connectedMac: String? = null
  private var watchDays = 3

  // Raw band responses for the device check report (guarded by rawLock)
  private val rawLock = Any()
  private var rawConnect = JSONObject()
  private val historyFields = sortedMapOf<String, FieldCoverage>()
  // What the last history sync did, step by step (no health values)
  private val historyLog = mutableListOf<String>()
  private val getterCache = mutableMapOf<Class<*>, List<Method>>()

  private class FieldCoverage {
    var records = 0
    val fieldsWithData = sortedSetOf<String>()
  }

  // JS listeners (Nitro calls them on the JS thread)
  private var onMeasurement: ((BandMeasurement) -> Unit)? = null
  private var onConnectionChange: ((Boolean) -> Unit)? = null
  private var onSyncProgress: ((Double) -> Unit)? = null
  private var onLog: ((String) -> Unit)? = null

  override fun setOnMeasurement(listener: (event: BandMeasurement) -> Unit) {
    onMeasurement = listener
  }

  override fun setOnConnectionChange(listener: (connected: Boolean) -> Unit) {
    onConnectionChange = listener
  }

  override fun setOnSyncProgress(listener: (progress: Double) -> Unit) {
    onSyncProgress = listener
  }

  override fun setOnLog(listener: (message: String) -> Unit) {
    onLog = listener
  }

  override fun clearListeners() {
    onMeasurement = null
    onConnectionChange = null
    onSyncProgress = null
    onLog = null
  }

  private val connectStatusListener = object : IABleConnectStatusListener() {
    override fun onConnectStatusChanged(mac: String?, status: Int) {
      val connected = status == Constants.STATUS_CONNECTED
      log("connection status: ${if (connected) "connected" else "disconnected"}")
      onConnectionChange?.invoke(connected)
    }
  }

  // region Connection

  override fun connect(mac: String, password: String, profile: BandProfile): Promise<BandInfo> {
    val promise = Promise<BandInfo>()
    val once = Once(promise)
    val timeout = Runnable { once.reject("Connection timed out") }
    mainHandler.postDelayed(timeout, CONNECT_TIMEOUT_MS)
    val fail = { message: String ->
      mainHandler.removeCallbacks(timeout)
      once.reject(message)
    }

    log("connecting")
    synchronized(rawLock) { rawConnect = JSONObject() }
    manager.setDeviceShowConfirm(false)
    manager.connectDevice(
      mac,
      IConnectResponse { code, _, isOadModel ->
        when {
          code != Code.REQUEST_SUCCESS -> fail("Connection failed (code $code)")
          isOadModel -> fail("The bracelet is in firmware-upgrade mode")
        }
      },
      INotifyResponse { state ->
        if (state != Code.REQUEST_SUCCESS) {
          fail("Could not open the data channel (code $state)")
          return@INotifyResponse
        }
        connectedMac = mac
        manager.registerConnectStatusListener(mac, connectStatusListener)
        confirmPassword(password, profile, once, timeout, fail)
      },
    )
    return promise
  }

  private fun confirmPassword(
    password: String,
    profile: BandProfile,
    once: Once<BandInfo>,
    timeout: Runnable,
    fail: (String) -> Unit,
  ) {
    var deviceNumber = 0
    var firmwareVersion = ""
    val functionsReceived = AtomicBoolean(false)
    val latestFunctions = AtomicReference<FunctionDeviceSupportData>()

    manager.confirmDevicePwd(
      writeResponse("confirmDevicePwd") { fail("Password command failed") },
      object : IPwdDataListener {
        override fun onPwdDataChange(data: PwdData) {
          putRaw("password", data)
          deviceNumber = data.getDeviceNumber()
          firmwareVersion = data.getDeviceVersion() ?: ""
          val status = data.getmStatus()
          if (status != EPwdStatus.CHECK_SUCCESS && status != EPwdStatus.CHECK_AND_TIME_SUCCESS) {
            fail("Password check failed ($status)")
          }
        }

        override fun onConnectionConfirmTimeout() {
          fail("The bracelet did not confirm the connection")
        }
      },
      object : IDeviceFuctionDataListener {
        override fun onFunctionSupportDataChange(data: FunctionDeviceSupportData) {
          putRaw("functionSupport", data)
          latestFunctions.set(data)
          if (!functionsReceived.compareAndSet(false, true)) return
          syncPersonInfo(profile) {
            // Build the capabilities from the latest (complete) function list
            mainHandler.postDelayed({
              val functions = latestFunctions.get() ?: data
              watchDays = functions.getWathcDay().coerceAtLeast(1)
              mainHandler.removeCallbacks(timeout)
              once.resolve(
                BandInfo(
                  deviceNumber = deviceNumber.toDouble(),
                  firmwareVersion = firmwareVersion,
                  watchDays = watchDays.toDouble(),
                  capabilities = capabilities(functions).toTypedArray(),
                  features = features(functions),
                ),
              )
            }, FUNCTIONS_SETTLE_MS)
          }
        }

        override fun onDeviceFunctionPackage1Report(data: DeviceFunctionPackage1) = putRaw("functionPackage1", data)
        override fun onDeviceFunctionPackage2Report(data: DeviceFunctionPackage2) = putRaw("functionPackage2", data)
        override fun onDeviceFunctionPackage3Report(data: DeviceFunctionPackage3) = putRaw("functionPackage3", data)
        override fun onDeviceFunctionPackage4Report(data: DeviceFunctionPackage4) = putRaw("functionPackage4", data)
        override fun onDeviceFunctionPackage5Report(data: DeviceFunctionPackage5) = putRaw("functionPackage5", data)
      },
      object : ISocialMsgDataListener {
        override fun onSocialMsgSupportDataChange(data: FunctionSocailMsgData) = putRaw("socialMsg", data)
        override fun onSocialMsgSupportDataChange2(data: FunctionSocailMsgData) = putRaw("socialMsg2", data)
      },
      ICustomSettingDataListener { data: CustomSettingData? -> putRaw("customSettings", data) },
      password,
      true,
    )
  }

  /** Height/weight/age are used by the band for calories, distance and BP. */
  private fun syncPersonInfo(profile: BandProfile, onDone: () -> Unit) {
    val info = PersonInfoData(
      if (profile.female) ESex.WOMEN else ESex.MAN,
      profile.heightCm.toInt(),
      profile.weightKg.toInt(),
      profile.age.toInt(),
      profile.stepGoal.toInt(),
    )
    manager.syncPersonInfo(
      writeResponse("syncPersonInfo") { onDone() },
      IPersonInfoDataListener { status: EOprateStauts ->
        log("syncPersonInfo: $status")
        onDone()
      },
      info,
    )
  }

  private fun capabilities(data: FunctionDeviceSupportData): List<String> {
    fun has(status: EFunctionStatus?) = status?.isHaveFunction() == true
    return buildList {
      add("heart_rate")
      add("steps")
      add("sleep_session")
      if (has(data.getSpo2H())) add("spo2")
      if (has(data.getBp())) add("blood_pressure")
      if (has(data.getTemperatureFunction())) add("temperature")
      if (has(data.getEcg())) add("ecg")
      if (has(data.getBloodGlucose())) add("glucose")
    }
  }

  /** Everything health-related the band reports about itself (for the device check report). */
  private fun features(data: FunctionDeviceSupportData): Map<String, String> = buildMap {
    fun status(name: String, value: EFunctionStatus?) = put(name, value?.name ?: "UNKNOWN")
    status("heartRate", data.getHeartDetect())
    status("bloodPressure", data.getBp())
    status("spo2", data.getSpo2H())
    status("spo2Apnea", data.getSpo2HBreathBreak())
    status("precisionSleep", data.getPrecisionSleep())
    status("temperature", data.getTemperatureFunction())
    status("ecg", data.getEcg())
    status("bloodGlucose", data.getBloodGlucose())
    status("bloodGlucoseRisk", data.getBloodGlucoseRiskAssessment())
    status("hrv", data.getHrvFunction())
    status("allDayHrv", data.getAllDayHrvFunc())
    status("breathing", data.getBeathFunction())
    status("fatigue", data.getFatigue())
    status("stress", data.getStress())
    status("bloodComponents", data.getBloodComponent())
    status("bodyComposition", data.getBodyComponent())
    status("womenHealth", data.getWomen())
    status("autoMeasure", data.getAutoMeasure())
    put("ecgType", data.getEcgType().toString())
    put("temperatureType", data.getTemptureType().toString())
    put("spo2Type", data.getSpo2hType().toString())
    put("hrvType", data.getHrvType().toString())
    put("originProtocolVersion", data.getOriginProtcolVersion().toString())
    put("watchDays", data.getWathcDay().toString())
  }

  override fun disconnect(): Promise<Unit> {
    val promise = Promise<Unit>()
    if (connectedMac == null) {
      promise.resolve(Unit)
      return promise
    }
    connectedMac = null
    manager.disconnectWatch(IBleWriteResponse { promise.resolve(Unit) })
    return promise
  }

  override fun isConnected(): Boolean = connectedMac != null && manager.isCurrentDeviceConnected()

  // endregion

  // region Manual measurements

  override fun startMeasurement(type: MeasurementType): Promise<Unit> {
    val promise = Promise<Unit>()
    val write = promiseWriteResponse("start $type", promise)
    when (type) {
      MeasurementType.HEART_RATE -> manager.startDetectHeart(write, heartListener)
      MeasurementType.SPO2 -> manager.startDetectSPO2H(write, spo2Listener)
      MeasurementType.BLOOD_PRESSURE -> manager.startDetectBP(write, bpListener, EBPDetectModel.DETECT_MODEL_PUBLIC)
      MeasurementType.TEMPERATURE -> manager.startDetectTempture(write, temperatureListener)
      MeasurementType.GLUCOSE -> manager.startBloodGlucoseDetect(write, glucoseListener)
      MeasurementType.ECG -> manager.startDetectECG(write, true, ecgListener)
    }
    return promise
  }

  override fun stopMeasurement(type: MeasurementType): Promise<Unit> {
    val promise = Promise<Unit>()
    val write = promiseWriteResponse("stop $type", promise)
    when (type) {
      MeasurementType.HEART_RATE -> manager.stopDetectHeart(write)
      MeasurementType.SPO2 -> manager.stopDetectSPO2H(write, spo2Listener)
      MeasurementType.BLOOD_PRESSURE -> manager.stopDetectBP(write, EBPDetectModel.DETECT_MODEL_PUBLIC)
      MeasurementType.TEMPERATURE -> manager.stopDetectTempture(write, temperatureListener)
      MeasurementType.GLUCOSE -> manager.stopBloodGlucoseDetect(write, glucoseListener)
      MeasurementType.ECG -> manager.stopDetectECG(write, true, ecgListener)
    }
    return promise
  }

  private val heartListener = IHeartDataListener { data ->
    emitMeasurement(MeasurementType.HEART_RATE, data.getHeartStatus()?.name, value = data.getData().toDouble())
  }

  private val spo2Listener = ISpo2hDataListener { data: Spo2hData ->
    emitMeasurement(
      MeasurementType.SPO2,
      data.getDeviceState()?.name,
      progress = data.getCheckingProgress(),
      value = data.getValue().toDouble(),
    )
  }

  private val bpListener = IBPDetectDataListener { data ->
    val done = data.getProgress() >= 100 && data.getHighPressure() > 0
    emitMeasurement(
      MeasurementType.BLOOD_PRESSURE,
      data.getStatus()?.name,
      progress = data.getProgress(),
      values = if (done) {
        mapOf("systolic" to data.getHighPressure().toDouble(), "diastolic" to data.getLowPressure().toDouble())
      } else null,
      done = done,
    )
  }

  private val temperatureListener = ITemptureDetectDataListener { data: TemptureDetectData ->
    // deviceState: 0 ok, 1-7 busy, 8 low battery, 9 sensor error; oprate 0 = not supported
    val state = when {
      data.getOprate() == 0 -> "NOT_SUPPORTED"
      data.getOprate() == 2 -> "STOPPED"
      data.getDeviceState() == 8 -> "LOW_BATTERY"
      data.getDeviceState() == 9 -> "SENSOR_ERROR"
      data.getDeviceState() in 1..6 -> "BUSY"
      else -> "MEASURING"
    }
    val done = data.getProgress() >= 100 && data.getTempture() > 0 && state == "MEASURING"
    emitMeasurement(
      MeasurementType.TEMPERATURE,
      if (done) "DONE" else state,
      progress = data.getProgress(),
      value = if (done) data.getTempture().toDouble() else null,
      done = done,
    )
  }

  private val glucoseListener = object : IBloodGlucoseChangeListener {
    override fun onBloodGlucoseDetect(progress: Int, value: Float, risk: EBloodGlucoseRiskLevel?) {
      val done = progress >= 100 && value > 0
      emitMeasurement(
        MeasurementType.GLUCOSE,
        if (done) "DONE" else "MEASURING",
        progress = progress,
        value = if (done) Math.round(value * MMOL_TO_MG_DL).toDouble() else null,
        done = done,
      )
    }

    override fun onDetectError(code: Int, status: EBloodGlucoseStatus?) {
      emitMeasurement(MeasurementType.GLUCOSE, status?.name ?: "ERROR", error = true)
    }

    override fun onBloodGlucoseStopDetect() {
      emitMeasurement(MeasurementType.GLUCOSE, "STOPPED")
    }

    override fun onBloodGlucoseAdjustingSettingSuccess(isOpen: Boolean, value: Float) {}
    override fun onBloodGlucoseAdjustingSettingFailed() {}
    override fun onBloodGlucoseAdjustingReadSuccess(isOpen: Boolean, value: Float) {}
    override fun onBloodGlucoseAdjustingReadFailed() {}
    override fun onBGMultipleAdjustingReadSuccess(isOpen: Boolean, breakfast: MealInfo?, lunch: MealInfo?, dinner: MealInfo?) {}
    override fun onBGMultipleAdjustingReadFailed() {}
    override fun onBGMultipleAdjustingSettingSuccess() {}
    override fun onBGMultipleAdjustingSettingFailed() {}
  }

  private val ecgListener = object : IECGDetectListener {
    override fun onEcgDetectInfoChange(info: EcgDetectInfo) {}

    override fun onEcgDetectStateChange(state: EcgDetectState) {
      emitMeasurement(
        MeasurementType.ECG,
        state.getDeviceState()?.name,
        progress = state.getProgress(),
        value = state.getHr1().toDouble().takeIf { it > 0 },
      )
    }

    override fun onEcgDetectResultChange(result: EcgDetectResult) {
      if (!result.isSuccess()) {
        emitMeasurement(MeasurementType.ECG, "FAILED", error = true)
        return
      }
      // Band time, so the same record read later from the history gets the same clientId
      val time = millis(result.getTimeBean(), null) ?: System.currentTimeMillis().toDouble()
      emitMeasurement(
        MeasurementType.ECG,
        "DONE",
        progress = 100,
        values = ecgSummary(result),
        done = true,
        timestamp = time,
        file = saveEcgWaveform(result, time),
      )
    }

    override fun onEcgDetectDiagnosisChange(diagnosis: EcgDiagnosis) {}
    override fun onEcgADCChange(ecgData: IntArray?, powerData: IntArray?) {}
  }

  // endregion

  // region Reads

  override fun readCurrentSteps(): Promise<BandSteps> {
    val promise = Promise<BandSteps>()
    val once = Once(promise)
    manager.readSportStep(writeResponse("readSportStep") { once.reject("readSportStep failed") }) { data ->
      once.resolve(
        BandSteps(
          timestamp = System.currentTimeMillis().toDouble(),
          steps = data.getStep().toDouble(),
          distanceM = data.getDis() * 1000,
          kcal = data.getKcal(),
        ),
      )
    }
    return promise
  }

  override fun readBattery(): Promise<BandBattery> {
    val promise = Promise<BandBattery>()
    val once = Once(promise)
    manager.readBattery(writeResponse("readBattery") { once.reject("readBattery failed") }) { data ->
      once.resolve(
        BandBattery(
          isPercent = data.isPercent(),
          percent = data.getBatteryPercent().toDouble(),
          level = data.getBatteryLevel().toDouble(),
          isLow = data.isLowBattery(),
        ),
      )
    }
    return promise
  }

  /**
   * Reads the history in steps (one SDK command at a time). Each step has its own timeout,
   * so a command the band does not answer cannot block the rest.
   */
  override fun syncHistory(): Promise<Array<BandReading>> {
    val promise = Promise<Array<BandReading>>()
    val once = Once(promise)
    val readings = mutableListOf<BandReading>()
    synchronized(rawLock) {
      historyFields.clear()
      historyLog.clear()
    }
    val finished = AtomicBoolean(false)
    val finish = { reason: String ->
      if (finished.compareAndSet(false, true)) {
        noteHistory("$reason: ${readings.size} readings")
        log("history: ${readings.size} readings")
        once.resolve(readings.toTypedArray())
      }
    }
    val overallTimeout = Runnable { finish("stopped after ${HISTORY_TIMEOUT_MS / 1000} s") }
    mainHandler.postDelayed(overallTimeout, HISTORY_TIMEOUT_MS)

    val features = VpSpGetUtil.getVpSpVariInstance(context)
    // Protocol 3/5 bands send 5-min data as OriginData3 (with SpO2 + glucose)
    val originV3 = features.getOriginProtocolVersion().let { it == 3 || it == 5 }
    val steps = buildList<HistoryStep> {
      if (originV3) {
        add(HistoryStep("sleep") { progress, next -> readSleep(readings, progress, next) })
        add(HistoryStep("origin v3") { progress, next -> readOriginV3(readings, progress, next) })
      } else {
        add(HistoryStep("sleep + origin") { progress, next -> readSleepAndOrigin(readings, progress, next) })
        if (features.isSupportSpo2h()) {
          add(HistoryStep("spo2") { progress, next -> readSpo2History(readings, progress, next) })
        }
      }
      if (features.isSupportECG()) {
        add(HistoryStep("ecg") { _, next -> readEcgRecords(readings, next) })
      }
    }
    noteHistory(
      "protocol v${features.getOriginProtocolVersion()}, $watchDays days, steps: ${steps.joinToString { it.name }}",
    )
    runSteps(steps, 0) {
      mainHandler.removeCallbacks(overallTimeout)
      finish("finished")
    }
    return promise
  }

  private class HistoryStep(val name: String, val run: (progress: (Float) -> Unit, next: () -> Unit) -> Unit)

  private fun runSteps(steps: List<HistoryStep>, index: Int, onDone: () -> Unit) {
    if (index >= steps.size) {
      onDone()
      return
    }
    val step = steps[index]
    val advanced = AtomicBoolean(false)
    val startedAt = System.currentTimeMillis()
    val timeout = Runnable {
      if (advanced.compareAndSet(false, true)) {
        noteHistory("step '${step.name}': timed out after ${HISTORY_STEP_TIMEOUT_MS / 1000} s")
        log("history step '${step.name}' timed out")
        runSteps(steps, index + 1, onDone)
      }
    }
    mainHandler.postDelayed(timeout, HISTORY_STEP_TIMEOUT_MS)
    val progress: (Float) -> Unit = { value ->
      onSyncProgress?.invoke((index + value.coerceIn(0f, 1f)).toDouble() / steps.size)
    }
    val next = {
      if (advanced.compareAndSet(false, true)) {
        noteHistory("step '${step.name}': done in ${(System.currentTimeMillis() - startedAt) / 1000} s")
        mainHandler.removeCallbacks(timeout)
        mainHandler.post { runSteps(steps, index + 1, onDone) }
      }
    }
    log("history step '${step.name}'")
    step.run(progress, next)
  }

  /** Older bands: sleep + 5-min temperature + 30-min HR/steps/BP in one command. */
  private fun readSleepAndOrigin(readings: MutableList<BandReading>, progress: (Float) -> Unit, next: () -> Unit) {
    manager.readAllHealthData(object : IAllHealthDataListener {
      override fun onProgress(value: Float) = progress(value)
      override fun onSleepDataChange(day: String?, sleep: SleepData?) = addSleep(readings, sleep)
      override fun onReadSleepComplete() {}
      override fun onOringinFiveMinuteDataChange(origin: OriginData?) = addFiveMinute(readings, origin)
      override fun onOringinHalfHourDataChange(halfHour: OriginHalfHourData?) = addHalfHour(readings, halfHour)
      override fun onReadOriginComplete() = next()
      override fun onReadTimeout(day: Int) {
        noteHistory("read timeout for day $day")
      }
    }, watchDays)
  }

  private fun readSleep(readings: MutableList<BandReading>, progress: (Float) -> Unit, next: () -> Unit) {
    manager.readSleepData(
      writeResponse("readSleepData") { next() },
      object : ISleepDataListener {
        override fun onSleepDataChange(day: String?, sleep: SleepData?) = addSleep(readings, sleep)
        override fun onSleepProgress(value: Float) = progress(value)
        override fun onSleepProgressDetail(day: String?, packageNumber: Int) {}
        override fun onReadSleepComplete() = next()
      },
      watchDays,
    )
  }

  /** Protocol 3/5 bands: 5-min data with SpO2 and glucose, plus the 30-min summary. */
  private fun readOriginV3(readings: MutableList<BandReading>, progress: (Float) -> Unit, next: () -> Unit) {
    manager.readOriginData(
      writeResponse("readOriginData") { next() },
      object : IOriginData3Listener {
        override fun onOriginFiveMinuteListDataChange(list: List<OriginData3>?) {
          list?.forEach { origin ->
            addFiveMinute(readings, origin)
            val mmol = origin.getBloodGlucose()
            val time = millis(origin.getmTime(), origin.getDate()) ?: return@forEach
            if (mmol > 0) {
              readings += reading("glucose", "mg/dL", time, value = Math.round(mmol * MMOL_TO_MG_DL).toDouble())
            }
          }
        }

        override fun onOriginHalfHourDataChange(halfHour: OriginHalfHourData?) = addHalfHour(readings, halfHour)
        override fun onOriginHRVOriginListDataChange(list: List<HRVOriginData>?) {
          list?.forEach { recordFields("HRVOriginData", it) }
        }
        override fun onOriginSpo2OriginListDataChange(list: List<Spo2hOriginData>?) {
          list?.forEach { addSpo2(readings, it) }
        }

        override fun onReadOriginProgressDetail(day: Int, date: String?, allPackage: Int, currentPackage: Int) {}
        override fun onReadOriginProgress(value: Float) = progress(value)
        override fun onReadOriginComplete() = next()
        override fun onReadTimeout(day: Int) {
          noteHistory("read timeout for day $day")
        }
      },
      watchDays,
    )
  }

  /** Older bands keep SpO2 in a separate store. */
  private fun readSpo2History(readings: MutableList<BandReading>, progress: (Float) -> Unit, next: () -> Unit) {
    manager.readSpo2hOrigin(
      writeResponse("readSpo2hOrigin") { next() },
      object : ISpo2hOriginDataListener {
        override fun onReadOriginProgress(value: Float) = progress(value)
        override fun onReadOriginProgressDetail(day: Int, date: String?, allPackage: Int, currentPackage: Int) {}
        override fun onSpo2hOriginListener(data: Spo2hOriginData?) {
          data?.let { addSpo2(readings, it) }
        }

        override fun onReadOriginComplete() = next()
      },
      watchDays,
    )
  }

  /** ECG records stored on the band (manual + automatic), each with its waveform file. */
  private fun readEcgRecords(readings: MutableList<BandReading>, next: () -> Unit) {
    manager.readECGData(
      writeResponse("readECGData") { next() },
      TimeData(0, 0, 0, 0, 0, 0, 0),
      EEcgDataType.ALL,
      object : IECGReadDataListener {
        override fun readDataFinish(results: List<EcgDetectResult>?) {
          results?.forEach { recordFields("EcgDetectResult", it) }
          results?.filter { it.isSuccess() }?.forEach { result ->
            val time = millis(result.getTimeBean(), null) ?: return@forEach
            readings += reading("ecg", "bpm", time, values = ecgSummary(result), file = saveEcgWaveform(result, time))
          }
          next()
        }

        override fun readDiagnosisDataFinish(list: List<EcgDiagnosis>?) {}
      },
    )
  }

  private fun addSleep(readings: MutableList<BandReading>, sleep: SleepData?) {
    sleep ?: return
    recordFields("SleepData", sleep)
    val start = millis(sleep.getSleepDown(), sleep.getDate()) ?: return
    val end = millis(sleep.getSleepUp(), sleep.getDate())
    readings += reading(
      "sleep_session", "min", start,
      values = buildMap {
        put("durationMinutes", sleep.getAllSleepTime().toDouble())
        put("deepMinutes", sleep.getDeepSleepTime().toDouble())
        put("lightMinutes", sleep.getLowSleepTime().toDouble())
        put("wakeCount", sleep.getWakeCount().toDouble())
        put("quality", sleep.getSleepQulity().toDouble())
        end?.let { put("endTimestamp", it) }
      },
    )
  }

  private fun addFiveMinute(readings: MutableList<BandReading>, origin: OriginData?) {
    origin ?: return
    recordFields(origin.javaClass.simpleName, origin)
    val temperature = origin.getTemperature()
    val time = millis(origin.getmTime(), origin.getDate()) ?: return
    if (temperature > 0) {
      readings += reading("temperature", "°C", time, value = temperature)
    }
  }

  private fun addHalfHour(readings: MutableList<BandReading>, halfHour: OriginHalfHourData?) {
    halfHour ?: return
    recordFields("OriginHalfHourData", halfHour)
    halfHour.getHalfHourRateDatas()?.forEach { recordFields("HalfHourRateData", it) }
    halfHour.getHalfHourSportDatas()?.forEach { recordFields("HalfHourSportData", it) }
    halfHour.getHalfHourBps()?.forEach { recordFields("HalfHourBpData", it) }
    halfHour.getHalfHourRateDatas()?.forEach { rate ->
      val time = millis(rate.getTime(), rate.getDate()) ?: return@forEach
      if (rate.getRateValue() > 0) {
        readings += reading("heart_rate", "bpm", time, value = rate.getRateValue().toDouble())
      }
    }
    halfHour.getHalfHourSportDatas()?.forEach { sport ->
      val time = millis(sport.getTime(), sport.getDate()) ?: return@forEach
      if (sport.getStepValue() > 0) {
        readings += reading(
          "steps", "steps", time,
          values = mapOf(
            "count" to sport.getStepValue().toDouble(),
            "distanceM" to sport.getDisValue() * 1000,
            "kcal" to sport.getCalValue(),
          ),
        )
      }
    }
    halfHour.getHalfHourBps()?.forEach { bp ->
      val time = millis(bp.getTime(), bp.getDate()) ?: return@forEach
      if (bp.getHighValue() > 0) {
        readings += reading(
          "blood_pressure", "mmHg", time,
          values = mapOf("systolic" to bp.getHighValue().toDouble(), "diastolic" to bp.getLowValue().toDouble()),
        )
      }
    }
  }

  private fun addSpo2(readings: MutableList<BandReading>, data: Spo2hOriginData) {
    recordFields("Spo2hOriginData", data)
    val oxygen = data.getOxygenValue()
    val time = millis(data.getmTime(), data.getDate()) ?: return
    if (oxygen in 1..100) {
      readings += reading("spo2", "%", time, value = oxygen.toDouble())
    }
  }

  private fun ecgSummary(result: EcgDetectResult) = mapOf(
    "heartRate" to result.getAveHeart().toDouble(),
    "hrv" to result.getAveHrv().toDouble(),
    "qt" to result.getAveQT().toDouble(),
    "respiratoryRate" to result.getAveResRate().toDouble(),
    "durationSec" to result.getDuration().toDouble(),
    "sampleRate" to result.getFrequency().toDouble(),
    "sampleCount" to (result.getFilterSignals()?.size ?: 0).toDouble(),
  )

  /**
   * Saves the ECG waveform in app-private storage (the API takes a file reference,
   * not inline samples). Same record => same file name, so a re-read overwrites it.
   */
  private fun saveEcgWaveform(result: EcgDetectResult, time: Double): String? {
    val filtered = result.getFilterSignals()?.takeIf { it.isNotEmpty() }
    val raw = result.getOriginSign()?.takeIf { it.isNotEmpty() }
    if (filtered == null && raw == null) return null
    return runCatching {
      val dir = File(context.filesDir, "ecg").apply { mkdirs() }
      val file = File(dir, "ecg_${time.toLong()}.json")
      val json = JSONObject().apply {
        put("timestamp", time.toLong())
        put("sampleRate", result.getFrequency())
        put("durationSec", result.getDuration())
        filtered?.let { put("samples", JSONArray(it)) }
        raw?.let { put("rawSamples", JSONArray(it)) }
      }
      file.writeText(json.toString())
      file.absolutePath
    }.onFailure { log("ECG waveform not saved (${it.javaClass.simpleName})") }.getOrNull()
  }

  // endregion

  // region Raw responses (device check report)

  override fun getRawResponses(): String = synchronized(rawLock) {
    JSONObject().apply {
      // History first: the connect dump is long and shared text can get cut
      put("historyLog", JSONArray(historyLog.toList()))
      put(
        "historyFields",
        JSONObject().apply {
          historyFields.forEach { (kind, coverage) ->
            put(
              kind,
              JSONObject()
                .put("records", coverage.records)
                .put("fieldsWithData", JSONArray(coverage.fieldsWithData.toList())),
            )
          }
        },
      )
      put("connect", JSONObject(rawConnect.toString()))
    }.toString(2)
  }

  private fun noteHistory(message: String) {
    synchronized(rawLock) {
      if (historyLog.size < 60) historyLog.add(message)
    }
  }

  /** Device configuration: every getter value (passwords masked). No health values here. */
  private fun putRaw(key: String, data: Any?) {
    data ?: return
    val json = JSONObject()
    getters(data.javaClass).forEach { method ->
      val name = fieldName(method)
      val value = runCatching { method.invoke(data) }.getOrNull() ?: return@forEach
      json.put(
        name,
        when {
          name.contains("pwd", ignoreCase = true) || name.contains("password", ignoreCase = true) -> "***"
          value is Number || value is Boolean || value is String -> value
          value is Enum<*> -> value.name
          value is IntArray -> JSONArray(value.toList())
          value is Collection<*> -> "${value.size} items"
          value is Array<*> -> "${value.size} items"
          // Long SDK toString() dumps (Chinese descriptions) repeat the values above
          else -> value.toString().let { if (it.length > 120) it.take(120) + "…" else it }
        },
      )
    }
    synchronized(rawLock) { rawConnect.put(key, json) }
  }

  /** Health records: counts which fields carry data, never the values themselves. */
  private fun recordFields(kind: String, record: Any) {
    val filled = getters(record.javaClass).filter { method ->
      when (val value = runCatching { method.invoke(record) }.getOrNull()) {
        null -> false
        is Number -> value.toDouble() != 0.0
        is Boolean -> value
        is String -> value.isNotEmpty()
        is IntArray -> value.any { it != 0 }
        is Collection<*> -> value.isNotEmpty()
        is Array<*> -> value.isNotEmpty()
        else -> true
      }
    }.map(::fieldName)
    synchronized(rawLock) {
      val coverage = historyFields.getOrPut(kind) { FieldCoverage() }
      coverage.records++
      coverage.fieldsWithData += filled
    }
  }

  private fun getters(type: Class<*>): List<Method> = synchronized(getterCache) {
    getterCache.getOrPut(type) {
      type.methods.filter { method ->
        method.parameterTypes.isEmpty() &&
          method.declaringClass != Any::class.java &&
          (method.name.startsWith("get") || method.name.startsWith("is"))
      }.sortedBy { it.name }
    }
  }

  private fun fieldName(method: Method) =
    method.name.removePrefix("get").removePrefix("is").replaceFirstChar { it.lowercase() }

  // endregion

  // region Helpers

  private fun emitMeasurement(
    type: MeasurementType,
    state: String?,
    progress: Int = -1,
    value: Double? = null,
    values: Map<String, Double>? = null,
    done: Boolean = false,
    error: Boolean = false,
    timestamp: Double = System.currentTimeMillis().toDouble(),
    file: String? = null,
  ) {
    onMeasurement?.invoke(
      BandMeasurement(
        type = type,
        state = state ?: "UNKNOWN",
        progress = progress.toDouble(),
        value = value,
        values = values,
        done = done,
        error = error,
        timestamp = timestamp,
        file = file,
      ),
    )
  }

  private fun reading(
    type: String,
    unit: String,
    timestamp: Double,
    value: Double? = null,
    values: Map<String, Double>? = null,
    file: String? = null,
  ) = BandReading(type = type, unit = unit, timestamp = timestamp, value = value, values = values, file = file)

  /** TimeData from the band is in the phone's local time; `date` (yyyy-MM-dd) fills in a missing day. */
  private fun millis(time: TimeData?, date: String?): Double? {
    time ?: return null
    val calendar = Calendar.getInstance()
    calendar.clear()
    if (time.getYear() > 0) {
      calendar.set(time.getYear(), time.getMonth() - 1, time.getDay(), time.getHour(), time.getMinute(), time.getSecond())
    } else {
      val day = date?.let {
        runCatching { SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(it) }.getOrNull()
      } ?: return null
      calendar.time = day
      calendar.set(Calendar.HOUR_OF_DAY, time.getHour())
      calendar.set(Calendar.MINUTE, time.getMinute())
    }
    return calendar.timeInMillis.toDouble()
  }

  private fun writeResponse(command: String, onFail: (() -> Unit)? = null) = IBleWriteResponse { code ->
    if (code != Code.REQUEST_SUCCESS) {
      log("$command: write failed ($code)")
      noteHistory("$command: write failed ($code)")
      onFail?.invoke()
    }
  }

  private fun promiseWriteResponse(command: String, promise: Promise<Unit>): IBleWriteResponse {
    val once = Once(promise)
    return IBleWriteResponse { code ->
      if (code == Code.REQUEST_SUCCESS) once.resolve(Unit) else once.reject("$command failed ($code)")
    }
  }

  /** Debug builds only – never logs health values or tokens. */
  private fun log(message: String) {
    if (!BuildConfig.DEBUG) return
    Log.d(TAG, message)
    onLog?.invoke(message)
  }

  // endregion

  /** The SDK can call back more than once; a promise must settle only once. */
  private class Once<T>(private val promise: Promise<T>) {
    private val settled = AtomicBoolean(false)

    fun resolve(value: T) {
      if (settled.compareAndSet(false, true)) promise.resolve(value)
    }

    fun reject(message: String) {
      if (settled.compareAndSet(false, true)) promise.reject(Error(message))
    }
  }
}
