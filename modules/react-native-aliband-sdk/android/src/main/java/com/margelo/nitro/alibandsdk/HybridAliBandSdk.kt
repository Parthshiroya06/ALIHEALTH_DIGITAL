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
import com.veepoo.protocol.listener.data.IECGDetectListener
import com.veepoo.protocol.listener.data.IHeartDataListener
import com.veepoo.protocol.listener.data.IPersonInfoDataListener
import com.veepoo.protocol.listener.data.IPwdDataListener
import com.veepoo.protocol.listener.data.ISocialMsgDataListener
import com.veepoo.protocol.listener.data.ISpo2hDataListener
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
import com.veepoo.protocol.model.datas.MealInfo
import com.veepoo.protocol.model.datas.OriginData
import com.veepoo.protocol.model.datas.OriginHalfHourData
import com.veepoo.protocol.model.datas.PersonInfoData
import com.veepoo.protocol.model.datas.PwdData
import com.veepoo.protocol.model.datas.SleepData
import com.veepoo.protocol.model.datas.Spo2hData
import com.veepoo.protocol.model.datas.TemptureDetectData
import com.veepoo.protocol.model.datas.TimeData
import com.veepoo.protocol.model.enums.EBPDetectModel
import com.veepoo.protocol.model.enums.EBloodGlucoseRiskLevel
import com.veepoo.protocol.model.enums.EBloodGlucoseStatus
import com.veepoo.protocol.model.enums.EFunctionStatus
import com.veepoo.protocol.model.enums.EOprateStauts
import com.veepoo.protocol.model.enums.EPwdStatus
import com.veepoo.protocol.model.enums.ESex
import com.veepoo.protocol.model.settings.CustomSettingData
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Nitro HybridObject around the H Band (Veepoo) SDK, used by the app's HBandAdapter.
 * The SDK runs one command at a time, so the JS adapter serialises the calls.
 * Timestamps are epoch milliseconds; the adapter converts them to UTC ISO-8601.
 */
class HybridAliBandSdk : HybridAliBandSdkSpec() {

  companion object {
    private const val TAG = "AliBandSdk"
    private const val CONNECT_TIMEOUT_MS = 30_000L
    private const val HISTORY_TIMEOUT_MS = 120_000L
    private const val MMOL_TO_MG_DL = 18.0182
  }

  private val manager: VPOperateManager by lazy {
    val context = NitroModules.applicationContext ?: throw Error("No Android context available")
    VPOperateManager.getInstance().apply { init(context.applicationContext) }
  }
  private val mainHandler = Handler(Looper.getMainLooper())
  private var connectedMac: String? = null
  private var watchDays = 3

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

    manager.confirmDevicePwd(
      writeResponse("confirmDevicePwd") { fail("Password command failed") },
      object : IPwdDataListener {
        override fun onPwdDataChange(data: PwdData) {
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
          if (!functionsReceived.compareAndSet(false, true)) return
          watchDays = data.getWathcDay().coerceAtLeast(1)
          val capabilities = capabilities(data)
          syncPersonInfo(profile) {
            mainHandler.removeCallbacks(timeout)
            once.resolve(
              BandInfo(
                deviceNumber = deviceNumber.toDouble(),
                firmwareVersion = firmwareVersion,
                watchDays = watchDays.toDouble(),
                capabilities = capabilities.toTypedArray(),
              ),
            )
          }
        }

        override fun onDeviceFunctionPackage1Report(data: DeviceFunctionPackage1) {}
        override fun onDeviceFunctionPackage2Report(data: DeviceFunctionPackage2) {}
        override fun onDeviceFunctionPackage3Report(data: DeviceFunctionPackage3) {}
        override fun onDeviceFunctionPackage4Report(data: DeviceFunctionPackage4) {}
        override fun onDeviceFunctionPackage5Report(data: DeviceFunctionPackage5) {}
      },
      object : ISocialMsgDataListener {
        override fun onSocialMsgSupportDataChange(data: FunctionSocailMsgData) {}
        override fun onSocialMsgSupportDataChange2(data: FunctionSocailMsgData) {}
      },
      ICustomSettingDataListener { _: CustomSettingData? -> },
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
      // Waveform samples stay on the phone for now (the API expects a file reference)
      emitMeasurement(
        MeasurementType.ECG,
        "DONE",
        progress = 100,
        values = mapOf(
          "heartRate" to result.getAveHeart().toDouble(),
          "hrv" to result.getAveHrv().toDouble(),
          "qt" to result.getAveQT().toDouble(),
          "respiratoryRate" to result.getAveResRate().toDouble(),
          "durationSec" to result.getDuration().toDouble(),
          "sampleRate" to result.getFrequency().toDouble(),
          "sampleCount" to (result.getFilterSignals()?.size ?: 0).toDouble(),
        ),
        done = true,
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

  override fun syncHistory(): Promise<Array<BandReading>> {
    val promise = Promise<Array<BandReading>>()
    val once = Once(promise)
    val readings = mutableListOf<BandReading>()
    val finish = Runnable {
      log("history: ${readings.size} readings")
      once.resolve(readings.toTypedArray())
    }
    mainHandler.postDelayed(finish, HISTORY_TIMEOUT_MS)

    manager.readAllHealthData(object : IAllHealthDataListener {
      override fun onProgress(progress: Float) {
        onSyncProgress?.invoke(progress.toDouble())
      }

      override fun onSleepDataChange(day: String?, sleep: SleepData?) {
        sleep ?: return
        val start = millis(sleep.getSleepDown(), sleep.getDate()) ?: return
        val end = millis(sleep.getSleepUp(), sleep.getDate())
        readings += BandReading(
          type = "sleep_session",
          unit = "min",
          timestamp = start,
          value = null,
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

      override fun onReadSleepComplete() {}

      override fun onOringinFiveMinuteDataChange(origin: OriginData?) {
        origin ?: return
        val temperature = origin.getTemperature()
        val time = millis(origin.getmTime(), origin.getDate()) ?: return
        if (temperature > 0) {
          readings += BandReading("temperature", "°C", time, temperature, null)
        }
      }

      override fun onOringinHalfHourDataChange(halfHour: OriginHalfHourData?) {
        halfHour ?: return
        halfHour.getHalfHourRateDatas()?.forEach { rate ->
          val time = millis(rate.getTime(), rate.getDate()) ?: return@forEach
          if (rate.getRateValue() > 0) {
            readings += BandReading("heart_rate", "bpm", time, rate.getRateValue().toDouble(), null)
          }
        }
        halfHour.getHalfHourSportDatas()?.forEach { sport ->
          val time = millis(sport.getTime(), sport.getDate()) ?: return@forEach
          if (sport.getStepValue() > 0) {
            readings += BandReading(
              "steps", "steps", time, null,
              mapOf(
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
            readings += BandReading(
              "blood_pressure", "mmHg", time, null,
              mapOf("systolic" to bp.getHighValue().toDouble(), "diastolic" to bp.getLowValue().toDouble()),
            )
          }
        }
      }

      override fun onReadOriginComplete() {
        mainHandler.removeCallbacks(finish)
        finish.run()
      }

      override fun onReadTimeout(day: Int) {
        log("history read timeout for day $day")
      }
    }, watchDays)
    return promise
  }

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
        timestamp = System.currentTimeMillis().toDouble(),
      ),
    )
  }

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
