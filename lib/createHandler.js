"use strict";

const Metrics = require( `../build/Release/native.node` );
const { response, "statusCodes": { NOT_FOUND, SERVICE_UNAVAILABLE }, timed } = require( `./utils` );

const rCleanPath = /^\/+|\?.+$/g;

const createHandler = options => {
    const metrics = new Metrics( options );
    const { health, ready, timeout, version } = options;
    const routes = new Map( [
        [ ``, timed( health, timeout ) ],
        [ `health`, timed( health, timeout ) ],
        [ `metrics`, timed( metrics.getMetrics.bind( metrics ), timeout ) ],
        [
            `ready`,
            timed( async () => {
                if ( !( await ready() ) ) {
                    throw new Error( `NOT READY` );
                }
            }, timeout ),
        ],
        [ `version`, version ],
    ] );
    return async path => {
        const route = routes.get( path.replace( rCleanPath, `` ) );
        if ( route ) {
            try {
                return response( await route() );
            } catch ( e ) {
                return response( `${ e?.message || e }`, SERVICE_UNAVAILABLE );
            }
        }
        return response( `NOT FOUND`, NOT_FOUND );
    };
};

module.exports = createHandler;
