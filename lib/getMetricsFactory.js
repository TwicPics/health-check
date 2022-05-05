"use strict";

const CPU = require( `./CPU` );
const getGPUInfo = require( `../build/Release/gpu.node` );
const Metrics = require( `./Metrics` );
const { snakify } = require( `./utils` );

const setCoreMetrics = ( name, set, info ) => {
    const internal = ( { index, list, memory, usage } ) => {
        const post = index === undefined ? `` : `{${ name }="${ index }"}`;
        if ( memory !== undefined ) {
            set( `${ name }_memory${ post }`, memory );
        }
        if ( usage !== undefined ) {
            set( `${ name }_usage${ post }`, usage );
        }
        if ( list && ( list.length > 1 ) ) {
            list.forEach( internal );
        }
    };
    internal( info );
};

const getMetricsFactory = ( getParentMetrics, { gpu, errorRatio, percentile, period, precision, prefix, ticks } ) => {

    const metrics = new Metrics( {
        percentile,
        precision,
        prefix,
        ticks,
    } );

    let p = new CPU();

    let error;
    let errorCount = 0;
    let tickCount = 0;

    setInterval( () => {
        metrics.update( async set => {
            ++tickCount;
            try {
                const n = new CPU();
                setCoreMetrics( `cpu`, set, n.getInfo( p ) );
                p = n;
                if ( gpu ) {
                    setCoreMetrics( `gpu`, set, getGPUInfo() );
                }
                if ( getParentMetrics ) {
                    for ( const [ name, value ] of Object.entries( await getParentMetrics() ) ) {
                        set( snakify( name ), value );
                    }
                }
            } catch ( e ) {
                ++errorCount;
                error = e;
            }
        } );
    }, period );

    return () => {
        try {
            if ( error && ( ( errorCount / tickCount ) >= errorRatio ) ) {
                throw error;
            }
            return metrics.toString();
        } finally {
            error = undefined;
            errorCount = 0;
            tickCount = 0;
        }
    };
};

module.exports = getMetricsFactory;
