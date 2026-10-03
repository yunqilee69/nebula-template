cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(rnoh_safe_area_generated_dir "${CMAKE_CURRENT_SOURCE_DIR}/generated")
file(GLOB_RECURSE rnoh_safe_area_generated_SRC "${rnoh_safe_area_generated_dir}/**/*.cpp")
file(GLOB rnoh_safe_area_SRC CONFIGURE_DEPENDS *.cpp)
add_library(rnoh_safe_area SHARED ${rnoh_safe_area_generated_SRC} ${rnoh_safe_area_SRC})
target_include_directories(rnoh_safe_area PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${rnoh_safe_area_generated_dir})
target_link_libraries(rnoh_safe_area PUBLIC rnoh)