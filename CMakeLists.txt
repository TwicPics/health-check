cmake_minimum_required(VERSION 3.18)

project(HealthCheck)

set(HEALTH_CHECK_VERSION_MAYOR 0)
set(HEALTH_CHECK_VERSION_MINOR 6)
set(HEALTH_CHECK_VERSION_PATCH 0)
set(HEALTH_CHECK_PACKAGE_VERSION ${HEALTH_CHECK_VERSION_MAYOR}.${HEALTH_CHECK_VERSION_MINOR}.${HEALTH_CHECK_VERSION_PATCH})

add_subdirectory(c++)
