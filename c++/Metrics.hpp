#pragma once

#include <algorithm>
#include <cmath>
#include <map>
#include <sstream>
#include <string>
#include <vector>

#include "./utils.hpp"

class Metrics
{
    private:
        class Metric
        {
            private:
                bool m_filled;
                size_t m_index;
                std::vector< double > m_list;
            public:
                inline Metric( size_t max_size ): m_filled( false ), m_index( 0 ), m_list( max_size ) {}
                inline Metric & add( double value )
                {
                    m_list[ m_index ] = value;
                    m_index = ( m_index + 1 ) % m_list.size();
                    if ( !m_filled )
                    {
                        m_filled = ( m_index == 0 );
                    }
                    return ( *this );
                }
                inline std::vector< double > get_sorted() const
                {
                    size_t size = m_filled ? m_list.size() : m_index;
                    std::vector< double > sorted( size );
                    std::partial_sort_copy( m_list.begin(), m_list.begin() + size, sorted.begin(), sorted.end() );
                    return sorted;
                }
        };
        
        static inline size_t m_get_index( size_t size, double percentile )
        {
            return ( size_t ) std::round( percentile * 0.01 * ( ( double ) ( size - 1 ) ) );
        }
        
        std::map< std::string, Metric > m_map;
        size_t m_ticks;

    public:
        inline Metrics( size_t ticks ): m_map(), m_ticks( ticks ) {}

        inline Metrics & add( std::string const & name, double value )
        {
            auto pair = m_map.try_emplace( name, m_ticks );
            pair.first->second.add( value );
            return ( *this );
        }

        inline std::string to_string(
            std::vector< double > const & percentiles,
            size_t precision,
            std::string const & prefix
        )
        {
            std::ostringstream output;
            output.precision( precision );
            output << std::fixed;
            std::for_each(
                m_map.begin(),
                m_map.end(),
                [ &output, &percentiles, &prefix ]( auto pair )
                {
                    auto results = pair.second.get_sorted();
                    if ( results.size() )
                    {
                        std::for_each(
                            percentiles.begin(),
                            percentiles.end(),
                            [ &output, &pair, &percentiles, &prefix, &results ]( double percentile )
                            {
                                output
                                    << prefix
                                    << (
                                        ( percentiles.size() > 1 ) ?
                                            add_label( pair.first, "p", ( size_t ) percentile ) :
                                            pair.first
                                    )
                                    << ' '
                                    << results[ m_get_index( results.size(), percentile ) ]
                                    << '\n';
                            }
                        );
                    }
                }
            );
            return output.str();
        }
};
