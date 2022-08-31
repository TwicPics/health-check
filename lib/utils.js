"use strict";

const betweenFactory = ( min, max, fallback, modifier ) => v => {
    const n = Number( v );
    if ( isNaN( n ) ) {
        return fallback;
    }
    return Math.max( min, Math.min( max, modifier ? modifier( n ) : n ) );
};

const noop = () => undefined;

const isFunctionFactory = ( fallback = noop ) => fn => ( ( typeof fn === `function` ) ? fn : fallback );

const sorterAscending = ( a, b ) => ( a - b );
const sortAscending = array => array.sort( sorterAscending );

const statusCodes = {
    "OK": 200,
    "METHOD_NOT_ALLOWED": 405,
    "NOT_FOUND": 404,
    "SERVICE_UNAVAILABLE": 503,
};

const response = ( body = `OK`, status = statusCodes.OK ) => (
    body instanceof Buffer ?
        {
            body,
            "headers": {
                "Content-Length": String( body.length ),
                "Content-Type": `text/plain`,
            },
            status,
        } :
        response( Buffer.from( body ), status )
);

const timed = ( func, timeout ) => (
    ( timeout > 0 ) ?
        () => Promise.race( [
            new Promise( reject => {
                setTimeout( () => {
                    reject( new Error( `TIMEOUT` ) );
                }, timeout );
            } ),
            func(),
        ] ) :
        func
);

module.exports = {
    betweenFactory,
    isFunctionFactory,
    response,
    sortAscending,
    statusCodes,
    timed,
};
