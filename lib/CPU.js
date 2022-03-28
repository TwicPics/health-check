"use strict";

const os = require( `os` );

class CPU {
    #list;
    #usageActive;
    #usageTotal;
    #memory;
    constructor() {
        this.#usageActive = 0;
        this.#usageTotal = 0;
        this.#list = os.cpus().map( ( { "times": { idle, irq, nice, sys, user } } ) => {
            const active = irq + nice + sys + user;
            const total = active + idle;
            this.#usageActive += active;
            this.#usageTotal += total;
            return {
                active,
                total,
            };
        } );
        this.#memory = 1 - ( os.freemem() / os.totalmem() );
    }
    getInfo( previous ) {
        return {
            "list": this.#list.slice( 0, Math.min( this.#list.length, previous.#list.length ) ).map(
                ( { active, total }, index ) => ( {
                    index,
                    "usage":
                        ( total > previous.#list[ index ].total ) ?
                            ( active - previous.#list[ index ].active ) / ( total - previous.#list[ index ].total ) :
                            0,
                } )
            ),
            "memory": this.#memory,
            "usage":
                ( this.#usageTotal > previous.#usageTotal ) ?
                    ( this.#usageActive - previous.#usageActive ) / ( this.#usageTotal - previous.#usageTotal ) :
                    0,
        };
    }
}

module.exports = CPU;
