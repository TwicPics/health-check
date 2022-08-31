#pragma once

#include <thread>

class Sleeper
{
    private:
        uint64_t m_period;
        uint64_t m_start;
    public:
        inline Sleeper( uint64_t period ): m_period( period ), m_start( now() ) {}
        inline void sleep()
        {
            auto max_end = m_start + m_period;
            auto end = now();
            if ( max_end > end )
            {
                std::this_thread::sleep_for( std::chrono::milliseconds( max_end - end ) );
                m_start = max_end;
            }
            else
            {
                m_start = end;
            }
        }
};
