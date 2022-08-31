#include <napi.h>

#include "./CPU.hpp"
#include "./Custom.hpp"
#include "./GPU.hpp"
#include "./Metrics.hpp"
#include "./Sleeper.hpp"
#include "./utils.hpp"

class Module: public Napi::ObjectWrap< Module >
{
    private:
        bool m_compute_cpu;
        bool m_compute_gpu;
        CPU m_cpu;
        Custom m_custom;
        GPU m_gpu;
        Metrics m_metrics;
        std::mutex m_mutex;
        std::vector< double > m_percentiles;
        uint64_t m_period;
        size_t m_precision;
        std::string m_prefix;
        bool m_running;
        std::future< void > m_thread;

        void m_loop()
        {
            Sleeper sleeper( m_period );
            
            auto handle_metric =
                [ this ]( std::string const & family, std::string const & type, double value, size_t n )
                {
                    auto name = family.size() ? family + '_' + type : type;
                    if ( n )
                    {
                        name = add_label( name, family, n );
                    }
                    m_metrics.add( name, value );
                };

            while ( m_running )
            {
                // wait for next period
                sleeper.sleep();

                // custom initiator
                auto future = m_custom.get_metrics();

                // cpu and gpu
                if ( m_compute_cpu || m_compute_gpu )
                {
                    std::unique_lock< std::mutex > lock( m_mutex );
                    if ( m_compute_cpu )
                    {
                        m_cpu.get_metrics( handle_metric );
                    }
                    if ( m_compute_gpu )
                    {
                        m_gpu.get_metrics( handle_metric );
                    }
                }

                // custom metrics
                {
                    auto custom = future.get();
                    std::unique_lock< std::mutex > lock( m_mutex );
                    for ( auto it = custom.begin(); it != custom.end(); ++it )
                    {
                        m_metrics.add( it->name, it->value );
                    }
                }
            }
        }
    public:
        static inline Napi::Object Init( Napi::Env const & env )
        {
            auto function = DefineClass(
                env,
                "Metrics",
                {
                    InstanceMethod< &Module::get_metrics >( "getMetrics" )
                }
            );
            Napi::FunctionReference* constructor = new Napi::FunctionReference();
            *constructor = Napi::Persistent( function );
            env.SetInstanceData< Napi::FunctionReference >( constructor );
            return function;
        }
        inline Module( Napi::CallbackInfo const & info, Napi::Object const & options ):
            Napi::ObjectWrap< Module >( info ),
            m_compute_cpu( options.Get( "cpu" ).ToBoolean() ),
            m_compute_gpu( options.Get( "gpu" ).ToBoolean() ),
            m_cpu(),
            m_custom( options.Get( "metrics" ).As< Napi::Function >() ),
            m_gpu(),
            m_metrics( ( size_t ) options.Get( "ticks" ).ToNumber().DoubleValue() ),
            m_percentiles( options.Get( "percentile" ).As< Napi::Array >().Length() ),
            m_period( ( uint64_t ) options.Get( "period" ).ToNumber().DoubleValue() ),
            m_precision( ( size_t ) options.Get( "precision" ).ToNumber().DoubleValue() ),
            m_prefix( options.Get( "prefix" ).As< Napi::String >() ),
            m_running( true ),
            m_thread( std::async( std::launch::async, std::bind( &Module::m_loop, this ) ) )
        {
            {
                auto array = options.Get( "percentile" ).As< Napi::Array >();
                size_t i = 0;
                for ( auto it = m_percentiles.begin(); it != m_percentiles.end(); ++it, ++i )
                {
                    ( *it ) = array.Get( i ).ToNumber().DoubleValue();
                }
            }
        }
        Module( Napi::CallbackInfo const & info ): Module( info, info[ 0 ].As< Napi::Object >() ) {}
        ~Module()
        {
            m_running = false;
        }

        Napi::Value get_metrics( Napi::CallbackInfo const & info  )
        {
            std::string output;
            {
                std::unique_lock< std::mutex > lock( m_mutex );
                output = m_metrics.to_string( m_percentiles, m_precision, m_prefix );
            }
            return Napi::String::New( info.Env(), output );
        }
};
