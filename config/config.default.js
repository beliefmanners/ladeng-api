'use strict';

module.exports = appInfo => {
  const config = {};

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1504597318621_8678';
    config.cors = {
        origin(ctx) {
            return ctx.request.header.origin;
        },
        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
        credentials: true
    };
    config.security = {
        csrf: false
    };
    config.io = {
        namespace: {
            '/': {
                connectionMiddleware: [ 'auth' ],
                packetMiddleware: [ 'filter' ]
            }
        }
    };
    /*config.redis = {
        client: {
            port: 6379,          // Redis port
            host: '127.0.0.1',   // Redis host
            password: '',
            db: 0
        }
    };*/
  return config;
};
