"use strict";

const { parentPort } = require( `worker_threads` );

const pending = new Map();
const availableKeys = [];
let lastKey = 0;

const receiveResponse = ( { error, id, response } ) => {
    const { forcedResponse, reject, resolve, timer } = pending.get( id );
    if ( timer ) {
        clearTimeout( timer );
    }
    pending.delete( id );
    availableKeys.push( id );
    if ( error ) {
        reject( new Error( error ) );
    } else {
        resolve( forcedResponse || response );
    }
};

parentPort.on( `message`, receiveResponse );

const callParentFactory = ( name, timeout, forcedResponse ) => () => {
    const id = availableKeys.pop() || ( ++lastKey );
    return new Promise( ( resolve, reject ) => {
        const item = {
            forcedResponse,
            reject,
            resolve,
            "timer": timeout && setTimeout( () => {
                item.timer = undefined;
                receiveResponse( {
                    "error": `timeout`,
                    id,
                } );
            }, timeout ),
        };
        pending.set( id, item );
        parentPort.postMessage( {
            id,
            name,
        } );
    } );
};

module.exports = callParentFactory;
