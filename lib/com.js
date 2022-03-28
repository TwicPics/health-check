"use strict";

const Pending = require( `./Pending` );

const com = ( port, methods ) => {
    const pending = new Pending();
    port.on( `message`, async message => {
        switch ( message.type ) {
            case `call`: {
                let error;
                let value;
                try {
                    value = await methods[ message.name ]( ...message.args );
                } catch ( e ) {
                    error = `${ e?.message || e }`;
                }
                port.postMessage( {
                    error,
                    "key": message.key,
                    value,
                    "type": `return`,
                } );
                break;
            }
            case `return`: {
                pending.finish( message );
                break;
            }
            default: {
                // eslint-disable-next-line no-console
                console.error( `com: unknown message type ${ message.type }` );
            }
        }
    } );
    return new Proxy( {}, {
        "get": ( _, name ) => {
            if ( Promise.prototype.hasOwnProperty( name ) ) {
                return undefined;
            }
            return ( ...args ) => {
                const { key, promise } = pending.create();
                port.postMessage( {
                    args,
                    key,
                    name,
                    "type": `call`,
                } );
                return promise;
            };
        },
    } );
};

module.exports = com;
