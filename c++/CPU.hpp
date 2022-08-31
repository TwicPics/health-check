#pragma once

extern "C"
{
    #include <sys/sysinfo.h>
}

#include <fstream>
#include <functional>
#include <sstream>
#include <string>
#include <vector>

class CPU
{
    private:
        struct Core
        {
            double user;
            double nice;
            double system;
            double idle;

            inline Core operator - ( Core const & other ) const
            {
                return {
                    user - other.user,
                    nice - other.nice,
                    system - other.system,
                    idle - other.idle
                };
            }

            inline double usage() const
            {
                double total = user + nice + system + idle;
                return ( total > 0. ) ? ( 1. - ( std::max( 0., idle ) / total ) ) : 0.;
            }
        };

        std::vector< Core > m_cores;

    public:
        inline CPU(): m_cores()
        {
            std::ifstream proc_stat( "/proc/stat" );
            std::string line;

            std::string name;

            while( std::getline( proc_stat, line ) && !line.compare( 0, 3, "cpu" ) )
            {
                std::istringstream line_stream( line );

                line_stream >> name;

                Core & core = m_cores.emplace_back();
                
                line_stream >> core.user;
                line_stream >> core.nice;
                line_stream >> core.system;
                line_stream >> core.idle;
            }
        }

        inline void get_metrics(
            std::function< void( std::string const &, std::string const &, double, size_t ) > const & handler
        )
        {
            // usage
            {
                CPU now;
                for ( size_t i = 0; i < now.m_cores.size(); ++i )
                {
                    Core core =
                        ( i < m_cores.size() ) ?
                            ( now.m_cores[ i ] - m_cores[ i ] ) :
                            now.m_cores[ i ];
                    handler( "cpu", "usage", core.usage(), i );
                }
                m_cores = now.m_cores;
            }
            // memory
            {
                struct sysinfo data;
                sysinfo( &data );
                handler( "cpu", "memory", 1. - ( ( double ) data.freeram ) / ( ( double ) data.totalram ), 0 ); 
            }
        }
};
