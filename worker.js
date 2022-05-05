"use strict";

const com = require( `./lib/com` );
const getMetricsFactory = require( `./lib/getMetricsFactory` );
const { parentPort } = require( `worker_threads` );
const parseOptions = require( `./lib/parseOptions` );
const { timeoutPromiseFactory } = require( `./lib/utils` );

const OK = 200;
const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;
const SERVICE_UNAVAILABLE = 503;

const parent = com(
    parentPort,
    {
        "start": rawOptions => {
            const options = parseOptions( rawOptions );

            const { handled, keepAlive, period, port, timeout, version } = options;

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
                            // eslint-disable-next-line no-magic-numbers
                            timeoutPromiseFactory( ( timeout > 0 ) ? Math.min( timeout, period / 2 ) : ( period / 2 ) )
                        ),
                        options
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
                handlers.set( `version`, () => version );
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
