"use strict";

const { roundFactory, sortAscending } = require( `./utils` );

const EMPTY = Symbol( `empty` );

const computePercentile = ( array, length, round ) => {
    const tmp = sortAscending( array.filter( x => ( x !== EMPTY ) ) );
    return round( tmp[ Math.max( 0, Math.min( tmp.length, length ) - 1 ) ] );
};

const rLabel = /(?<hasLabel>}?)$/;

class Metrics {
    #index;
    #map;
    #percentile;
    #prefix;
    #round;
    #ticks;
    constructor( { percentile, precision, prefix, ticks } ) {
        this.#index = 0;
        this.#map = new Map();
        this.#prefix = prefix;
        this.#percentile = percentile.map(
            p => ( {
                "label": `p="${ p }"`,
                // eslint-disable-next-line no-magic-numbers
                "ticks": Math.min( ticks, Math.max( 1, Math.round( ticks * ( p / 100 ) ) ) ),
            } )
        );
        this.#round = roundFactory( precision );
        this.#ticks = ticks;
    }
    toString() {
        const list = [];
        for ( const [ name, array ] of this.#map ) {
            for ( const { label, ticks } of this.#percentile ) {
                const actualName =
                    ( this.#percentile.length > 1 ) ?
                        name.replace( rLabel, ( _, hasLabel ) => `${ hasLabel ? `,` : `{` }${ label }}` ) :
                        name;
                list.push(
                    `${ this.#prefix }${ actualName } ${ computePercentile( array, ticks, this.#round ) }`
                );
            }
        }
        return list.join( `\n` );
    }
    async update( fn ) {
        const notSet = new Set( this.#map.keys() );
        await fn( ( name, value ) => {
            notSet.delete( name );
            let array = this.#map.get( name );
            if ( !array ) {
                this.#map.set( name, ( array = ( new Array( this.#ticks ) ).fill( EMPTY ) ) );
            }
            array[ this.#index ] = value;
        } );
        for ( const name of notSet ) {
            this.#map.get( name )[ this.#index ] = EMPTY;
        }
        this.#index = ( this.#index + 1 ) % this.#ticks;
    }
}

module.exports = Metrics;
