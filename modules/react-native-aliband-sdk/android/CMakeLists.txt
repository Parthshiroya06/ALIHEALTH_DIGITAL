project(AliBandSdk)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME AliBandSdk)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

# Enable Raw Props parsing in react-native (for Nitro Views)
add_compile_options(-DRN_SERIALIZABLE_STATE=1)

add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
)

# Nitrogen-generated specs
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/AliBandSdk+autolinking.cmake)

include_directories("src/main/cpp")

find_library(LOG_LIB log)

target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  android
)
