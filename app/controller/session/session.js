'use strict';

module.exports = app => {
    class SessionController extends app.Controller {
        constructor(props) {
            super(props);
            this.userField = [];
        }
        * login(ctx) {
            const { userName, password } = ctx.request.body;
            if(!userName || !password) {
                this.error('参数有误');
                return;
            }
            const { service } = this;
            let chexkResult = yield service.session.session.chexkLogin(userName, password);
            if (chexkResult.status > 300) {
                this.error('账号或密码有误');
                return
            }
            // 用户入库
            let userInfo = yield service.session.session.checkUserIsExit(chexkResult.data.id);
            let userResult, baseInfo = Object.assign({},chexkResult.data,{password, roleIds: 1});
            if(!userInfo.status) { //插入用户信息
                userResult = yield service.session.session.saveUserInfo1(baseInfo);
            } else {
                baseInfo.loginCount = userInfo.data.loginCount;
                userResult = yield service.session.session.updateUserInfo(baseInfo);
            }
            if (userResult && userResult.status)
                this.success(userResult.data);
            else
                this.error()

        }
        * checkLogin(ctx) {
            const { token } = ctx.request.headers;
            if (!token) {
                this.error('没有权限', 401);
                return;
            }
            const { service } = this;
            let result = yield service.session.session.checkToken(token);
            if(result.status)
                this.success(result.data);
            else
                this.error(result.msg)

        }
    }
    return SessionController;
};
