cmake_minimum_required(VERSION 3.18)

function(extract_from_nodejs)
    set(flags)
    set(args)
    set(listArgs COMMAND WORKING_DIRECTORY OUTPUT_VARIABLE)

    cmake_parse_arguments(arg "${flags}" "${args}" "${listArgs}" ${ARGN})

    if (NOT arg_COMMAND)
        message(FATAL_ERROR "[extract_from_nodejs]: COMMAND is a required argument")
    endif()
    if (NOT arg_WORKING_DIRECTORY)
        message(FATAL_ERROR "[extract_from_nodejs]: WORKING_DIRECTORY is a required argument")
    endif()
    if (NOT arg_OUTPUT_VARIABLE)
        message(FATAL_ERROR "[extract_from_nodejs]: OUTPUT_VARIABLE is a required argument")
    endif()

    execute_process(COMMAND node -p "${arg_COMMAND}"
        WORKING_DIRECTORY ${arg_WORKING_DIRECTORY}
        OUTPUT_VARIABLE COMMAND_RESULT
        )
    string(REGEX REPLACE "\n$" "" COMMAND_RESULT "${COMMAND_RESULT}")
    string(STRIP ${COMMAND_RESULT} COMMAND_RESULT)
    string(REPLACE "\"" "" COMMAND_RESULT ${COMMAND_RESULT})
    string(REPLACE "\n" ";" COMMAND_RESULT ${COMMAND_RESULT})
    set(${arg_OUTPUT_VARIABLE} "${COMMAND_RESULT}" PARENT_SCOPE)
endfunction()

option(HEALTH_CHECK_DISABLE_GPU "GPU is force to not be supported" OFF)

find_library(HEALTH_CHECK_NVIDIA_ML_DEP nvidia-ml)
include(GNUInstallDirs)

set(HEALTH_CHECK_SUPPORTS_GPU TRUE)
if(HEALTH_CHECK_NVIDIA_ML_DEP STREQUAL "HEALTH_CHECK_NVIDIA_ML_DEP-NOTFOUND" 
    OR ${HEALTH_CHECK_DISABLE_GPU})
    set(HEALTH_CHECK_SUPPORTS_GPU FALSE)
endif() 

message(STATUS "Health Check supports GPU: " ${HEALTH_CHECK_SUPPORTS_GPU})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(HEALTH_CHECK_NAPI_VERSION 8)

######################
# Library Definition #
######################

set(HEALTH_CHECK_ADDON_NAME "native")

add_library(${HEALTH_CHECK_ADDON_NAME} SHARED)


# Aliased library with namespace for external usage
add_library(HealthCheck::Addon ALIAS ${HEALTH_CHECK_ADDON_NAME})

set(HEALTH_CHECK_CONFIG_FILE_NAME "HealthCheckConfig.h")
set(HEALTH_CHECK_CONFIG_FILE ${CMAKE_CURRENT_BINARY_DIR}/${HEALTH_CHECK_CONFIG_FILE_NAME})
configure_file("${HEALTH_CHECK_CONFIG_FILE_NAME}.in" ${HEALTH_CHECK_CONFIG_FILE})


message(STATUS "Health Check's config is generated into: ${HEALTH_CHECK_CONFIG_FILE}")

target_sources(${HEALTH_CHECK_ADDON_NAME} 
    PUBLIC
        $<BUILD_INTERFACE:${HEALTH_CHECK_CONFIG_FILE}>
        $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}/${HEALTH_CHECK_CONFIG_FILE_NAME}>
    PRIVATE
        _.cc 
        ${CMAKE_JS_SRC})

set_property(TARGET native PROPERTY PUBLIC_HEADER "$<TARGET_PROPERTY:native,INTERFACE_SOURCES>")

set_target_properties(${HEALTH_CHECK_ADDON_NAME} PROPERTIES 
    PREFIX ""
    SUFFIX ".node")

SET(CMAKE_SKIP_BUILD_RPATH  FALSE)
SET(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)
SET(CMAKE_INSTALL_RPATH "\${ORIGIN}") 
target_compile_options(${HEALTH_CHECK_ADDON_NAME} 
    PRIVATE
        -fexceptions
        -fpermissive
        -Wall
        $<$<CONFIG:Debug>:-g -pg -O0>
        $<$<CONFIG:Release>:-O3>
        )

target_link_options(${HEALTH_CHECK_ADDON_NAME} 
    PRIVATE
    # Ensure runtime linking is relative to native.node
        "-Wl,--disable-new-dtags"
    # Boosts internal calls
        "-Wl,-Bsymbolic-functions")


extract_from_nodejs(COMMAND "require('node-addon-api').include"
                    WORKING_DIRECTORY  ${CMAKE_SOURCE_DIR}
                    OUTPUT_VARIABLE NODE_ADDON_API_DIR)

target_include_directories(${HEALTH_CHECK_ADDON_NAME}
    PRIVATE
        ${CMAKE_JS_INC}
        ${NODE_ADDON_API_DIR}
        ${CMAKE_CURRENT_BINARY_DIR}
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
        $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>)

target_link_libraries(${HEALTH_CHECK_ADDON_NAME}
    PUBLIC 
        ${CMAKE_JS_LIB}
        )

if(${HEALTH_CHECK_SUPPORTS_GPU})
    target_link_libraries(${HEALTH_CHECK_ADDON_NAME} PUBLIC ${HEALTH_CHECK_NVIDIA_ML_DEP})
endif()

#############
# Packaging #
#############

include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    HealthCheckConfigVersion.cmake
    VERSION ${HEALTH_CHECK_PACKAGE_VERSION}
    COMPATIBILITY SameMajorVersion
    )

# Install files according to the component settings:
#    For Runtime install we need to place only the binaries and dynamic libraries 
#    For Build we need to install namlinkens and headers
install(TARGETS ${HEALTH_CHECK_ADDON_NAME}
        EXPORT HealthCheckTargets
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR} 
            COMPONENT HEALTH_CHECK_RUNTIME
            NAMELINK_COMPONENT HEALTH_CHECK_DEVELOPMENT
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
            COMPONENT HEALTH_CHECK_DEVELOPMENT
        RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
            COMPONENT HEALTH_CHECK_RUNTIME
        PUBLIC_HEADER DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
            COMPONENT HEALTH_CHECK_DEVELOPMENT
        INCLUDES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
        )
install(EXPORT HealthCheckTargets
        FILE HealthCheckTargets.cmake
        NAMESPACE HealthCheck::
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/HealthCheck
         )
configure_file(HealthCheckConfig.cmake.in HealthCheckConfig.cmake @ONLY)
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/HealthCheckConfig.cmake"
              "${CMAKE_CURRENT_BINARY_DIR}/HealthCheckConfigVersion.cmake"
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/HealthCheck
        )

set(CPACK_PACKAGE_NAME "HealthCheck")
set(CPACK_PACKAGE_VENDOR "TwickPics")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY
    "HealthCheck - Health check library for twicpics products")
set(CPACK_PACKAGE_VERSION ${HEALTH_CHECK_PACKAGE_VERSION})
set(CPACK_PACKAGE_VERSION_MAJOR ${HEALTH_CHECK_VERSION_MAYOR})
set(CPACK_PACKAGE_VERSION_MINOR ${HEALTH_CHECK_VERSION_MINOR})
set(CPACK_PACKAGE_VERSION_PATCH ${HEALTH_CHECK_VERSION_PATCH})

include(CPack)

cpack_add_component(HEALTH_CHECK_RUNTIME DISPLAY_NAME "Runtime")
cpack_add_component(HEALTH_CHECK_DEVELOPMENT DISPLAY_NAME "Dev")