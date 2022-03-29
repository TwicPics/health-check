"use strict";

const com = require( `./lib/com` );
const getMetricsFactory = require( `./lib/getMetricsFactory` );
const { parentPort } = require( `worker_threads` );
const parseOptions = require( `./lib/parseOptions` );
const { timeoutPromiseFactory } = require( `./lib/utils` );

const METRICS_FREQUENCY = 2_000;
const METRICS_TIMEOUT = 1_000;

const OK = 200;
const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;
const SERVICE_UNAVAILABLE = 503;

const parent = com(
    parentPort,
    {
        "start": options => {
            const
                { gpu, errorRatio, handled, keepAlive, percentile, port, precision, prefix, ticks, timeout, version } =
                    parseOptions( options );

            const callParentFactory =
                ( name, forcedResponse, timeoutPromise ) =>
                    () => timeoutPromise( parent[ name ]().then( response => forcedResponse || response ) );

            const ok = () => `OK`;
            const healthHandler =
                handled.health ? callParentFactory( `health`, `OK`, timeoutPromiseFactory( timeout ) ) : ok;
            const handlers = new Map( [
                [ ``, healthHandler ],
                [ `health`, healthHandler ],
                [
                    `metrics`,
                    getMetricsFactory(
                        handled.metrics && callParentFactory(
                            `metrics`,
                            undefined,
                            timeoutPromiseFactory(
                                ( timeout > 0 ) ? Math.min( timeout, METRICS_TIMEOUT ) : METRICS_TIMEOUT
                            )
                        ),
                        {
                            gpu,
                            errorRatio,
                            "frequency": METRICS_FREQUENCY,
                            percentile,
                            precision,
                            prefix,
                            ticks,
                        }
                    ),
                ],
                [
                    `ready`,
                    handled.ready ?
                        ( callParentReady => async () => {
                            if ( !( await callParentReady() ) ) {
                                throw new Error( `NOT READY` );
                            }
                        } )( callParentFactory( `ready`, `OK`, timeoutPromiseFactory( timeout ) ) ) :
                        ok,
                ],
            ] );

            if ( version !== undefined ) {
                handlers.set( `version`, () => `${ version }` );
            }

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
                                body = `${ e?.message || e }`;
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
        },
    }
);
