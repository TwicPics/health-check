"use strict";

require( `..` )( {
    "metrics": () => ( {
        "randomStuff": Math.random(),
    } ),
    "percentile": `67 33 82`,
    "prefix": `test`,
    "version": `1.35.2`,
} );
