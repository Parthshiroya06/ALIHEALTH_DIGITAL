require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "AliBandSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/Parthshiroya06/ALIHEALTH_DIGITAL"
  s.license      = "UNLICENSED"
  s.authors      = "ALIHEALTH DIGITAL"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Parthshiroya06/ALIHEALTH_DIGITAL.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
  ]

  # H Band iOS SDK (downloaded by `yarn sdk:hband:ios`, git-ignored). Its frameworks are
  # iPhone-only (arm64), so it is linked for device builds only; simulator builds and
  # machines without the SDK compile the stub in HybridAliBandSdk.swift.
  frameworks_dir = File.join(__dir__, "ios", "Frameworks")
  if File.exist?(File.join(frameworks_dir, "VeepooBleSDK.framework"))
    device = "[sdk=iphoneos*]"
    s.dependency "FMDB"
    s.dependency "MJExtension"
    s.resources = ["ios/Frameworks/SDKResours.bundle"]
    s.pod_target_xcconfig = {
      "FRAMEWORK_SEARCH_PATHS#{device}" => "$(inherited) \"#{frameworks_dir}\"",
      "SWIFT_ACTIVE_COMPILATION_CONDITIONS#{device}" => "$(inherited) ALIBAND_VEEPOO",
    }
    # Watch-face / firmware-upgrade libraries are weak-linked and not embedded (unused here)
    s.user_target_xcconfig = {
      "FRAMEWORK_SEARCH_PATHS#{device}" => "$(inherited) \"#{frameworks_dir}\"",
      "OTHER_LDFLAGS#{device}" => "$(inherited) -framework VeepooBleSDK -framework JL_BLEKit " \
        "-framework DFUnits -weak_framework JLDialUnit -weak_framework ZipZap " \
        "-weak_framework GRDFUSDK -weak_framework ABParTool -framework CoreBluetooth -lz",
    }
  end

  load "nitrogen/generated/ios/AliBandSdk+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
