"use strict";

const betweenFactory = ( min, max, fallback, modifier ) => v => {
    const n = Number( v );
    if ( isNaN( n ) ) {
        return fallback;
    }
    return Math.max( min, Math.min( max, modifier ? modifier( n ) : n ) );
};

const identity = x => x;

const noop = () => undefined;

const roundFactory = precision => n => parseFloat( n.toFixed( precision ) );

const sortFactory = ordering => array => array.sort( ordering );

const sortAscending = sortFactory( ( a, b ) => ( a - b ) );
const sortDescending = sortFactory( ( a, b ) => ( b - a ) );

const rCamel = /(?<letter>[A-Z])/g;
const snakify = str => str.replace( rCamel, ( _, l ) => `_${ l.toLowerCase() }` );

const timeoutPromiseFactory = timeout => (
    ( timeout > 0 ) ?
        promise => Promise.race( [
            new Promise( reject => {
                setTimeout( () => {
                    reject( new Error( `TIMEOUT` ) );
                }, timeout );
            } ),
            promise,
        ] ).then( () => promise ) :
        identity
);

module.exports = {
    betweenFactory,
    identity,
    noop,
    roundFactory,
    snakify,
    sortAscending,
    sortDescending,
    timeoutPromiseFactory,
};
