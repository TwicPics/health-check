"use strict";

const createFunction = require( `./createFunction` );
const { createServer } = require( `http` );
const { response, "statusCodes": { METHOD_NOT_ALLOWED } } = require( `./utils` );
const withOptions = require( `./withOptions` );

module.exports = withOptions( options => {
    const func = createFunction( options );
    createServer(
        async ( req, res ) => {
            const { body, headers, statusCode } =
                ( req.method === `GET` ) ?
                    await func( req.url ) :
                    response( `METHOD NOT ALLOWED`, METHOD_NOT_ALLOWED );
            res.writeHead( statusCode, headers );
            res.end( body );
        }
    ).listen( options.port ).keepAliveTimeout = options.keepAlive;
} );
