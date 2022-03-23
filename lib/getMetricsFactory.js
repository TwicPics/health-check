"use strict";

const { "getUsage": getGPUInfo } = require( `../build/Release/gpu.node` );
const os = require( `os` );

const CPU_INTERVAL = 2_000;
const RATIO_PRECISION = 100;

const rCamel = /(?<letter>[A-Z])/g;

const computeCPUData = cpuData => cpuData.reduce( ( { idle, total }, { times } ) => ( {
    "idle": idle + times.idle,
    "total": total + times.idle + times.irq + times.nice + times.sys + times.user,
} ), {
    "idle": 0,
    "total": 0,
} );
let previous = os.cpus();
let next = previous;
setInterval( () => {
    previous = next;
    next = os.cpus();
}, CPU_INTERVAL );

const getCPUUsage = () => {
    const p = computeCPUData( previous );
    const n = computeCPUData( next );
    return ( n.total > p.total ) ? ( 1 - ( ( n.idle - p.idle ) / ( n.total - p.total ) ) ) : 0;
};

const getCPUMemory = () => 1 - ( os.freemem / os.totalmem );

const roundRatio = ratio => Math.round( ratio * RATIO_PRECISION ) / RATIO_PRECISION;

const snakify = str => str.replace( rCamel, ( _, l ) => `_${ l.toLowerCase() }` );

const getMetricsFactory = ( getParentMetrics, { gpu, prefix } ) => {
    const actualPrefix = prefix ? `${ prefix }_` : ``;
    return async () => {
        const response = getParentMetrics && ( await getParentMetrics() );
        const metrics = [
            `${ actualPrefix }cpu_memory ${ roundRatio( getCPUMemory() ) }`,
            `${ actualPrefix }cpu_usage ${ roundRatio( getCPUUsage() ) }`,
        ];
        if ( gpu ) {
            const pushGPUMetrics = ( { compute, index, list, memory } ) => {
                const gpuPrefix = `${ actualPrefix }gpu${ index === undefined ? `` : index }_`;
                metrics.push(
                    `${ gpuPrefix }memory ${ roundRatio( memory ) }`,
                    `${ gpuPrefix }usage ${ roundRatio( compute ) }`
                );
                if ( list && ( list.length > 1 ) ) {
                    list.forEach( pushGPUMetrics );
                }
            };
            pushGPUMetrics( getGPUInfo() );
        }
        if ( response ) {
            metrics.push(
                ...Object.entries( response ).map( ( [ k, v ] ) => `${ actualPrefix }${ snakify( k ) } ${ v }` )
            );
        }
        return metrics.join( `\n` );
    };
};

module.exports = getMetricsFactory;
