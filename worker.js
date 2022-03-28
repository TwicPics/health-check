"use strict";

const com = require( `./lib/com` );
const getMetricsFactory = require( `./lib/getMetricsFactory` );
const { parentPort } = require( `worker_threads` );
const { timeoutPromiseFactory } = require( `./lib/utils` );

const DEFAULT_ERROR_RATIO = 0;
const DEFAULT_GPU = true;
const DEFAULT_KEEP_ALIVE = 60_000;
const DEFAULT_PERCENTILE = 75;
const DEFAULT_PORT = 8080;
const DEFAULT_PRECISION = 3;
const DEFAULT_TICKS = 30;
const DEFAULT_TIMEOUT = 1_000;

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
            // eslint-disable-next-line object-curly-newline
            const {
                gpu = DEFAULT_GPU,
                errorRatio = DEFAULT_ERROR_RATIO,
                handled = {},
                keepAlive = DEFAULT_KEEP_ALIVE,
                percentile = DEFAULT_PERCENTILE,
                port = DEFAULT_PORT,
                precision = DEFAULT_PRECISION,
                prefix,
                ticks = DEFAULT_TICKS,
                timeout = DEFAULT_TIMEOUT,
                version,
            // eslint-disable-next-line object-curly-newline
            } = options || {};

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

            if ( version ) {
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
