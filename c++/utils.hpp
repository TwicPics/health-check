#pragma once

#include <string>

template< typename Type >
static inline std::string add_label( std::string const & expression, std::string const & name, Type value )
{
    if ( expression.size() && ( expression.back() == '}' ) )
    {
        return expression.substr( 0, expression.size() - 1 ) + ',' + name + '=' + std::to_string( value ) + '}';
    }
    return expression + '{' + name + '=' + std::to_string( value ) + '}';
}

static inline uint64_t now()
{
    return std::chrono::duration_cast< std::chrono::milliseconds >(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
}
