'use strict';

module.exports = app => {
    app.io.route('link', app.controller.webhook.deployproject.index);
};
