/* eslint-disable no-magic-numbers, no-param-reassign */
"use strict";

const { betweenFactory, isFunctionFactory, sortAscending } = require( `./utils` );

const clampPercentile = betweenFactory( 1, 100, undefined, Math.round );
const isFunction = isFunctionFactory();
const notFalse = bool => ( bool !== false );
const roundSToMs = s => Math.round( s * 1_000 );

const rPrefix = /_?$/;
const rSpaces = /\s+/;

const handlers = {
    "cpu": notFalse,
    "gpu": notFalse,
    "health": isFunction,
    "keepAlive": betweenFactory( 0, Number.POSITIVE_INFINITY, 60_000, roundSToMs ),
    "metrics": isFunction,
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
    "period": betweenFactory( 500, Number.POSITIVE_INFINITY, 2_000, roundSToMs ),
    "port": betweenFactory( 0, 65535, 8080 ),
    "precision": betweenFactory( 0, Number.POSITIVE_INFINITY, 3, Math.round ),
    "prefix": prefix => {
        if ( ( typeof prefix === `string` ) && ( prefix = prefix.trim() ) ) {
            return prefix.replace( rPrefix, `_` );
        }
        return ``;
    },
    "ready": isFunctionFactory( () => true ),
    "ticks": betweenFactory( 1, Number.POSITIVE_INFINITY, 30, Math.round ),
    "timeout": betweenFactory( 0, Number.POSITIVE_INFINITY, 1_000, roundSToMs ),
    "version": version => ( version ? () => String( version ) : undefined ),
};

const PARSED = Symbol( `these options have been parsed` );

const parse = ( options = {} ) => {
    if ( options[ PARSED ] ) {
        return options;
    }
    const parsed = Object.fromEntries( Object.entries( handlers ).map(
        ( [ key, handler ] ) => [ key, handler( options.hasOwnProperty( key ) ? options[ key ] : undefined ) ]
    ) );
    parsed[ PARSED ] = true;
    return parsed;
};

module.exports = fn => options => fn( parse( options ) );
