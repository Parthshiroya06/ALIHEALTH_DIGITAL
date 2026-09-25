package com.margelo.nitro.alibandsdk

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

/** Autolinked by React Native; loads the Nitro C++ library that registers HybridAliBandSdk. */
class AliBandSdkPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { emptyMap() }

  companion object {
    init {
      AliBandSdkOnLoad.initializeNative()
    }
  }
}
