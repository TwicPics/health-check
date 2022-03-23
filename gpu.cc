#if __has_include( <nvml.h> )
extern "C"
{
    #include <nvml.h>
}
#define __HAS_NVML
#endif

#include <napi.h>

using namespace Napi;

Value get_usage( CallbackInfo const & info )
{
    auto main_object = Object::New( info.Env() );
    auto list = Array::New( info.Env() );
    main_object.Set( "list", list );
    uint32_t list_count = 0;
    double compute_count = 0.;
    double sum_compute = 0.;
    double sum_memory_total = 0.;
    double sum_memory_used = 0.;
    #ifdef __HAS_NVML
    unsigned int device_count;
    if ( nvmlDeviceGetCount( &device_count ) == NVML_SUCCESS )
    {
        for ( unsigned int i = 0; i < device_count; ++i )
        {
            nvmlDevice_t device;
            if ( nvmlDeviceGetHandleByIndex( i, &device ) == NVML_SUCCESS )
            {
                double compute = -1.;
                double memory = -1.;
                nvmlUtilization_t utilization_t;
                if ( nvmlDeviceGetUtilizationRates( device, &utilization_t ) == NVML_SUCCESS )
                {
                    compute = ( ( double ) utilization_t.gpu ) / 100.;
                    ++compute_count;
                    sum_compute += compute;
                }
                nvmlMemory_t memory_s;
                if ( nvmlDeviceGetMemoryInfo( device, &memory_s ) == NVML_SUCCESS )
                {
                    double memory_used = ( double ) memory_s.used;
                    double memory_total = ( double ) memory_s.total;
                    memory = memory_used / memory_total;
                    sum_memory_total += memory_total;
                    sum_memory_used += memory_used;
                }
                auto object = Object::New( info.Env() );
                list.Set( list_count++, object );
                object.Set( "compute", compute );
                object.Set( "index", i );
                object.Set( "memory", memory );
            }
            break;
        }
    }
    #endif
    main_object.Set( "compute", compute_count ? ( sum_compute / compute_count ) : -1. );
    main_object.Set( "memory", sum_memory_total ? ( sum_memory_used / sum_memory_total ) : -1. );
    return main_object;
}

Object init( Env env, Object exports )
{
    #ifdef __HAS_NVML
    nvmlInit_v2();
    #endif
    exports.Set( "getUsage", Function::New( env, get_usage ) );
    return exports;
}

NODE_API_MODULE( NODE_GYP_MODULE_NAME, init )

