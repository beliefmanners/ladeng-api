
'use strict';

module.exports = () => {
    return function* (next) {
        console.log('this.packet',this.packet);
        yield* next;
        console.log('packet response!');
    };
};
