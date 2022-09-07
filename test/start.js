"use strict";

let counter = 0;

// eslint-disable-next-line no-magic-numbers
setInterval( () => ( ++counter ), 1666 );

// eslint-disable-next-line no-unused-vars
const asyncRandomStuff = async () => {
    // eslint-disable-next-line no-magic-numbers
    await new Promise( resolve => setTimeout( resolve, 1000 ) );
    return {
        "#counter": counter,
        "randomStuff": Math.random(),
    };
};

// eslint-disable-next-line no-unused-vars
const asyncThrowsStuff = async () => {
    // eslint-disable-next-line no-magic-numbers
    await new Promise( resolve => setTimeout( resolve, 1000 ) );
    throw new Error( `OH MY GOD!` );
};

// eslint-disable-next-line no-unused-vars
const randomStuff = () => ( {
    "#counter": counter,
    "randomStuff": Math.random(),
} );

// eslint-disable-next-line no-unused-vars
const throwsStuff = () => {
    throw new Error( `OH MY GOD!` );
};

require( `..` ).createServer( {
    "metrics": randomStuff,
    "percentile": 50,
    "prefix": `test`,
    "version": `1.35.2`,
} );
