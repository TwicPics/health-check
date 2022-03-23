"use strict";

const workerCode = ( options, baseRequireDir ) => {

    const callParentFactory = require( `${ baseRequireDir }/lib/callParentFactory` );
    const getMetricsFactory = require( `${ baseRequireDir }/lib/getMetricsFactory` );

    const DEFAULT_KEEP_ALIVE = 60_000;
    const DEFAULT_PORT = 8080;
    const DEFAULT_TIMEOUT = 1_000;
    const DEFAULT_VERSION = `unknown`;
    const OK = 200;
    const METHOD_NOT_ALLOWED = 405;
    const NOT_FOUND = 404;
    const SERVICE_UNAVAILABLE = 503;

    // eslint-disable-next-line object-curly-newline
    const {
        gpuMetrics = true,
        handled = {},
        keepAlive = DEFAULT_KEEP_ALIVE,
        metricsPrefix,
        port = DEFAULT_PORT,
        timeout = DEFAULT_TIMEOUT,
        version = DEFAULT_VERSION,
    // eslint-disable-next-line object-curly-newline
    } = options || {};

    const ok = () => `OK`;
    const healthHandler = handled.health ? callParentFactory( `health`, timeout, `OK` ) : ok;
    const handlers = new Map( [
        [ ``, healthHandler ],
        [ `health`, healthHandler ],
        [
            `metrics`,
            getMetricsFactory( handled.metrics && callParentFactory( `metrics`, timeout ), {
                "gpu": gpuMetrics,
                "prefix": metricsPrefix,
            } ),
        ],
        [
            `ready`,
            handled.ready ?
                callParentFactory( `ready`, timeout ).then( isReady => {
                    if ( !isReady ) {
                        throw new Error( `NOT READY` );
                    }
                    return `OK`;
                } ) :
                ok,
        ],
        [ `version`, () => version ],
    ] );

    const rQuery = /\?.+$/;

    require( `http` )
        .createServer( async ( request, response ) => {
            let body;
            let status = OK;
            if ( request.method === `GET` ) {
                const handler = handlers.get( request.url.slice( 1 ).replace( rQuery, `` ) );
                if ( handler ) {
                    try {
                        body = await handler();
                    } catch ( e ) {
                        body = `${ e }`;
                        status = SERVICE_UNAVAILABLE;
                    }
                } else {
                    status = NOT_FOUND;
                }
            } else {
                status = METHOD_NOT_ALLOWED;
            }
            const buffer = Buffer.from( body || `` );
            response.writeHead( status, status === OK ? {
                "Content-Length": buffer.length,
                "Content-Type": `text/plain`,
            } : undefined );
            response.end( buffer );
        } )
        .listen( port ).keepAliveTimeout = keepAlive;
};

const { Worker } = require( `worker_threads` );

module.exports = ( { keepAlive, metricsPrefix, port, readyTimeout, timeout, version, ...handlers } = {} ) => {
    const worker = new Worker( `(${ workerCode })(${ JSON.stringify( {
        "handled": Object.fromEntries( Object.entries( handlers ).map(
            ( [ name, func ] ) => [ name, typeof func === `function` ]
        ) ),
        keepAlive,
        metricsPrefix,
        port,
        readyTimeout,
        timeout,
        version,
    } ) },${ JSON.stringify( __dirname ) })`, {
        "eval": true,
    } );
    worker.on( `message`, async ( { id, name } ) => {
        let error;
        let response;
        try {
            response = await handlers[ name ]();
        } catch ( e ) {
            error = `${ e }`;
        }
        worker.postMessage( {
            error,
            id,
            response,
        } );
    } );
};
