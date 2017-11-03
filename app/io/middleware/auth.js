'use strict';

module.exports = () => {
    return function* (next) {
        yield* next;
        console.log('disconnect!');
    };
};
