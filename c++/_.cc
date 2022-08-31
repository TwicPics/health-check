#include <napi.h>

#include "./Module.hpp"

Napi::Object init( Napi::Env env, Napi::Object )
{
    return Module::Init( env );
}

NODE_API_MODULE( NODE_GYP_MODULE_NAME, init )
