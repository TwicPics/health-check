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

find_package(CUDAToolkit)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(HEALTH_CHECK_NAPI_VERSION 8)

set(HEALTH_CHECK_ADDON_NAME "native")

add_library(${HEALTH_CHECK_ADDON_NAME} SHARED)

target_sources(${HEALTH_CHECK_ADDON_NAME} 
    PRIVATE
            _.cc 
            ${CMAKE_JS_SRC})

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

if(TARGET CUDA::nvml)
   target_link_libraries(${HEALTH_CHECK_ADDON_NAME} CUDA::nvml)
endif() 

extract_from_nodejs(COMMAND "require('node-addon-api').include"
                    WORKING_DIRECTORY  ${CMAKE_SOURCE_DIR}
                    OUTPUT_VARIABLE NODE_ADDON_API_DIR)

target_include_directories(${HEALTH_CHECK_ADDON_NAME}
    PRIVATE
        ${CMAKE_JS_INC}
        ${NODE_ADDON_API_DIR}
        "${CMAKE_CURRENT_SOURCE_DIR}")

target_link_libraries(${HEALTH_CHECK_ADDON_NAME}
    PRIVATE 
        ${CMAKE_JS_LIB})