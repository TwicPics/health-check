#if __has_include( <nvml.h> )
extern "C"
{
    #include <nvml.h>
}
#define __HAS_NVML
#endif

#include <napi.h>

using namespace Napi;

Value get_info( CallbackInfo const & info )
{
    auto main_object = Object::New( info.Env() );
    auto list = Array::New( info.Env() );
    main_object.Set( "list", list );
    uint32_t list_count = 0;
    double usage_count = 0.;
    double sum_usage = 0.;
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
                double memory = 0.;
                double usage = 0.;
                nvmlMemory_t memory_s;
                if ( nvmlDeviceGetMemoryInfo( device, &memory_s ) == NVML_SUCCESS )
                {
                    double memory_used = ( double ) memory_s.used;
                    double memory_total = ( double ) memory_s.total;
                    memory = memory_used / memory_total;
                    sum_memory_total += memory_total;
                    sum_memory_used += memory_used;
                }
                nvmlUtilization_t utilization_t;
                if ( nvmlDeviceGetUtilizationRates( device, &utilization_t ) == NVML_SUCCESS )
                {
                    usage = ( ( double ) utilization_t.gpu ) / 100.;
                    ++usage_count;
                    sum_usage += usage;
                }
                auto object = Object::New( info.Env() );
                list.Set( list_count++, object );
                object.Set( "index", i );
                object.Set( "memory", memory );
                object.Set( "usage", usage );
            }
            break;
        }
    }
    #endif
    main_object.Set( "memory", sum_memory_total ? ( sum_memory_used / sum_memory_total ) : 0. );
    main_object.Set( "usage", usage_count ? ( sum_usage / usage_count ) : 0. );
    return main_object;
}

Object init( Env env, Object )
{
    #ifdef __HAS_NVML
    nvmlInit_v2();
    #endif
    return Function::New( env, get_info );
}

NODE_API_MODULE( NODE_GYP_MODULE_NAME, init )
