/* eslint-disable no-magic-numbers, no-param-reassign */
"use strict";

const { betweenFactory, identity, sortAscending } = require( `./utils` );

const clampPercentile = betweenFactory( 1, 100, undefined, Math.round );

const rPrefix = /_?$/;
const rSpaces = /\s+/;

const handlers = {
    "gpu": gpu => ( gpu !== false ),
    "errorRatio": betweenFactory( 0, 1, 0 ),
    "handled": identity,
    "keepAlive": betweenFactory( 0, Number.POSITIVE_INFINITY, 60_000, Math.round ),
    "percentile": percentile => {
        if ( typeof percentile === `string` ) {
            percentile = percentile.trim().split( rSpaces );
        }
        if ( !Array.isArray( percentile ) ) {
            percentile = [ percentile ];
        }
        percentile = percentile.map( clampPercentile ).filter( v => ( v !== undefined ) );
        return percentile.length ? sortAscending( [ ...( new Set( percentile ) ) ] ) : [ 75 ];
    },
    "port": betweenFactory( 0, 65535, 8080 ),
    "precision": betweenFactory( 0, Number.POSITIVE_INFINITY, 3, Math.round ),
    "prefix": prefix => {
        if ( ( typeof prefix === `string` ) && ( prefix = prefix.trim() ) ) {
            return prefix.replace( rPrefix, `_` );
        }
        return ``;
    },
    "ticks": betweenFactory( 0, Number.POSITIVE_INFINITY, 30, true ),
    "timeout": betweenFactory( 0, Number.POSITIVE_INFINITY, 1_000, t => ( t < 1 ? Math.ceil( t ) : Math.round( t ) ) ),
    "version": version => ( version ? String( version ) : undefined ),
};

const parseOptions = ( options = {} ) => Object.fromEntries( Object.entries( handlers ).map(
    ( [ key, handler ] ) => [ key, handler( options.hasOwnProperty( key ) ? options[ key ] : undefined ) ]
) );

module.exports = parseOptions;
