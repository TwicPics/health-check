"use strict";

const identity = x => x;

const noop = () => undefined;

const roundFactory = precision => n => parseFloat( n.toFixed( precision ) );

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
    identity,
    noop,
    roundFactory,
    snakify,
    timeoutPromiseFactory,
};
