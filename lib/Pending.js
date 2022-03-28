"use strict";

class Pending {
    #deferreds;
    #keys;
    #lastKey;
    constructor() {
        this.#deferreds = new Map();
        this.#keys = [];
        this.#lastKey = 0;
    }
    create() {
        const deferred = {};
        const key = this.#keys.pop() || ( ++( this.#lastKey ) );
        this.#deferreds.set( key, deferred );
        deferred.promise = new Promise( ( resolve, reject ) => Object.assign( deferred, {
            reject,
            resolve,
        } ) );
        return {
            key,
            "promise": deferred.promise,
        };
    }
    finish( { error, key, value } ) {
        const { reject, resolve } = this.#deferreds.get( key );
        this.#deferreds.delete( key );
        this.#keys.push( key );
        if ( error ) {
            reject( error );
        } else {
            resolve( value );
        }
    }
}

module.exports = Pending;
