project(rnapp)
cmake_minimum_required(VERSION 3.13)
set(CMAKE_SYSTEM_NAME OHOS)
set(NATIVERENDER_ROOT_PATH ${CMAKE_CURRENT_SOURCE_DIR})

set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(OH_MODULES_DIR "${RNOH_APP_DIR}/../../../oh_modules")
# RN 0.77 移除了 butter::（ReactCommon/butter），safe-area-context 鸿蒙适配包的
# codegen 产物仍引用 butter::map；强制前置包含别名 shim，见 shim/butter_map_shim.h。
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/shim)
add_compile_options(-include butter_map_shim.h)
add_subdirectory("${OH_MODULES_DIR}/@rnoh/react-native-openharmony/src/main/cpp" ./rnoh)
add_subdirectory("${OH_MODULES_DIR}/@react-native-oh-tpl/react-native-safe-area-context/src/main/cpp" ./rnoh_safe_area)

add_library(rnoh_app SHARED
    ./CPPPackage.cpp
    "${OH_MODULES_DIR}/@rnoh/react-native-openharmony/src/main/cpp/RNOHAppNapiBridge.cpp"
)
target_link_libraries(rnoh_app PUBLIC rnoh rnoh_safe_area)
