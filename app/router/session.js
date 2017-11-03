'use strict';
module.exports = app => {
    /*
     * @api { POST } /api/session/login 登录
     * @apiVersion 1.0.0
     * @apiGroup session
     * @apiParam {String} username 用户名
     * @apiParam {start_date} password 密码
     * @apiSampleRequest /api/session/login
     * */
    app.post('/api/session/login', app.controller.session.session.login);
    /*
    * @api { get } /api/session/checkLogin 检查登录
    * @query token 用户的token
    * */
    app.get('/api/session/checkLogin', app.controller.session.session.checkLogin)
};
