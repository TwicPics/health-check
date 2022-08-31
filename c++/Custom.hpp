#pragma once

#include <future>
#include <napi.h>
#include <string>
#include <vector>

class Custom
{
    private:
        static inline std::string to_snake_case( std::string const & expression )
        {
            std::ostringstream output;
            for ( auto it = expression.begin(); it != expression.end(); ++it )
            {
                if ( isupper( *it ) )
                {
                    if ( it != expression.begin() )
                    {
                        output << '_';
                    }
                    output << ( unsigned char ) tolower( *it );
                }
                else
                {
                    output << ( *it );
                }
            }
            return output.str();
        }

        Napi::ThreadSafeFunction m_function;
    
    public:
        inline Custom( Napi::Function const & function ):
            m_function( Napi::ThreadSafeFunction::New( function.Env(), function, "custom metrics", 0, 2 ) ) {}

        struct Metric
        {
            std::string name;
            double value;
        };

    private:
        inline void handle_return_value(
            Napi::Value const & value,
            std::shared_ptr< std::promise< std::vector< Metric > > > promise
        ) const
        {
            if ( value.IsPromise() )
            {
                    value.As< Napi::Promise >().Get( "then" ).As< Napi::Function >().Call(
                        value,
                        {
                            Napi::Function::New(
                                value.Env(),
                                [ promise, this ]( Napi::CallbackInfo const & info )
                                {
                                    handle_return_value( info[ 0 ], promise );
                                }
                            ),
                            Napi::Function::New(
                                value.Env(),
                                [ promise ]( Napi::CallbackInfo const & info )
                                {
                                    promise->set_value( {} );
                                }
                            )
                        }
                    );
                    return;
            }
            std::vector< Metric > results;
            if ( value.IsObject() )
            {
                auto object = value.As< Napi::Object >();
                auto property_names = object.GetPropertyNames();
                for ( size_t i = 0; i < property_names.Length(); ++i )
                {
                    auto name = property_names.Get( i );
                    auto value = object.Get( name );
                    if ( value.IsNumber() )
                    {
                        results.emplace_back( ( struct Metric ) {
                            to_snake_case( name.ToString() ),
                            value.ToNumber()
                        } );
                    }
                }
            }
            promise->set_value( results );
        }

    public:
        inline std::future< std::vector< Metric > > get_metrics() const
        {
            auto promise = std::make_shared< std::promise< std::vector< Metric > > >();
            m_function.NonBlockingCall(
                [ promise, this ]( Napi::Env env, Napi::Function function )
                {
                    try
                    {
                        handle_return_value( function.Call( {} ), promise );
                    }
                    catch ( Napi::Error const & )
                    {
                        promise->set_value( {} );
                    }
                }
            );
            return promise->get_future();
        }
};
