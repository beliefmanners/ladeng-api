'use strict';

// had enabled by egg
// exports.static = true;
exports.cors = {
    enable: true,
    package: 'egg-cors'
};

exports.security = {
    domainWhiteList: [ 'http://localhost:8000']
};

exports.io = {
    enable: true,
    package: 'egg-socket.io',
};
exports.redis = {
    enable: true,
    package: 'egg-redis',
};
