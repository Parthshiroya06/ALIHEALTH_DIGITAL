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

  load "nitrogen/generated/ios/AliBandSdk+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
