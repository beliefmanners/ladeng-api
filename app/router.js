'use strict';

module.exports = app => {
    require('./router/user.js')(app);
    require('./router/menu.js')(app);
    require('./router/element.js')(app);
    // 用户组
    require('./router/group')(app);
    // 角色
    require('./router/role')(app);
    // 会话  登录等
    require('./router/session.js')(app);
    // 服务
    require('./router/service')(app);
    // webhook
    require('./router/webhook')(app);
    require('./router/io')(app);
    app.get('/', 'home.index');
    app.post('/home', 'home.index');
};
