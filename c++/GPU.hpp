#pragma once

#include <HealthCheckConfig.h>

#if HEALTH_CHECK_SUPPORTS_GPU
extern "C"
{
    #include <nvml.h>
}
#endif

#include <functional>
#include <string>

class GPU
{
    private:
        #if HEALTH_CHECK_SUPPORTS_GPU 
        static int INIT __attribute((unused));
        #endif
    public:
        inline GPU() {}

        inline void get_metrics(
            std::function< void( std::string const &, std::string const &, double, size_t ) > const & handler
        ) const
        {
            #if HEALTH_CHECK_SUPPORTS_GPU 
            double sum_usage = 0.;
            double sum_memory_total = 0.;
            double sum_memory_used = 0.;
            double usage_count = 0.;
            unsigned int device_count = 0;
            if ( nvmlDeviceGetCount( &device_count ) == NVML_SUCCESS )
            {
                int offset = ( device_count > 1 ) ? 1 : 0;
                for ( unsigned int i = 0; i < device_count; ++i )
                {
                    nvmlDevice_t device;
                    if ( nvmlDeviceGetHandleByIndex( i, &device ) == NVML_SUCCESS )
                    {
                        nvmlMemory_t memory_s;
                        if ( nvmlDeviceGetMemoryInfo( device, &memory_s ) == NVML_SUCCESS )
                        {
                            auto memory_used = ( double ) memory_s.used;
                            auto memory_total = ( double ) memory_s.total;
                            sum_memory_total += memory_total;
                            sum_memory_used += memory_used;
                            handler( "gpu", "memory", memory_used / memory_total, i + offset );
                        }
                        nvmlUtilization_t utilization_t;
                        if ( nvmlDeviceGetUtilizationRates( device, &utilization_t ) == NVML_SUCCESS )
                        {
                            double usage = ( ( double ) utilization_t.gpu ) / 100.;
                            handler( "gpu", "usage", usage, i + offset );
                            ++usage_count;
                            sum_usage += usage;
                        }
                    }
                }
            }
            if ( device_count > 1 )
            {
                handler( "gpu", "memory", sum_memory_used ? ( sum_memory_total / sum_memory_used ) : 0., 0 );
                handler( "gpu", "usage", usage_count ? ( sum_usage / usage_count ) : 0., 0 );
            }
            #endif
        }
};

#if HEALTH_CHECK_SUPPORTS_GPU
int GPU::INIT = nvmlInit_v2();
#endif
