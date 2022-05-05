"use strict";

const com = require( `./lib/com` );
const { Worker } = require( `worker_threads` );

module.exports = (
    { gpu, errorRatio, keepAlive, percentile, period, port, precision, prefix, timeout, ticks, version, ...handlers } =
    {}
) => {
    com( new Worker( `${ __dirname }/worker.js` ), handlers ).start( {
        gpu,
        errorRatio,
        "handled": Object.fromEntries( Object.entries( handlers ).map(
            ( [ name, func ] ) => [ name, typeof func === `function` ]
        ) ),
        keepAlive,
        percentile,
        period,
        port,
        precision,
        prefix,
        ticks,
        timeout,
        version,
    } );
};
