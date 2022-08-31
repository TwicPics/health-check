"use strict";

const createHandler = require( `./lib/createHandler` );
const parseOptions = require( `./lib/parseOptions` );
const { response, "statusCodes": { METHOD_NOT_ALLOWED } } = require( `./lib/utils` );

const server = options => {
    // eslint-disable-next-line no-param-reassign
    options = parseOptions( options );
    const handler = createHandler( options );
    require( `http` )
        .createServer( async ( req, res ) => {
            const { body, headers, status } =
                ( req.method === `GET` ) ?
                    await handler( req.url ) :
                    response( `METHOD NOT ALLOWED`, METHOD_NOT_ALLOWED );
            res.writeHead( status, headers );
            res.end( body );
        } )
        .listen( options.port ).keepAliveTimeout = options.keepAlive;
};

server.createHandler = options => createHandler( parseOptions( options ) );

module.exports = server;
