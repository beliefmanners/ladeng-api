'use strict';

module.exports = app => {
    // 用户管理
    class UserController extends app.Controller {
        /*
        *  查询所有 user
        * */
        * findAll() {
            const { service } = this;
            const result = yield service.user.user.findAll();
            if (!result.length) { this.error('没有查询到数据'); } else { this.success(result); }
        }
        /*
         *  @query id 查询某个用户的情况
         *
         * */
        * findById(ctx) {
            const { id } = ctx.query;
            if (id == undefined) {
              this.error('参数有误, 没有id');
              return;
            }
            const { service } = this;
            const result = yield service.user.user.findById(id);
            if (result.status) { this.success(result.data); } else { this.error(result.msg); }
        }
        /*
         *  激活用户
         *  @query id user id
         * */
        * activeUser(ctx) {
            const { id, status = 1 } = ctx.query;
            if (id == undefined) {
              this.error('参数有误, 没有id');
              return;
            }
            const { service } = this;
            const result = yield service.user.user.activeById(id, parseInt(status) || 1);
            if (result) { this.success(); } else { this.error('激活失败'); }
        }
        /*
        * 配置用户 权限
        * */
        * configRight(ctx) {
            const { id, menuIds, elementIds, roleIds } = ctx.request.body;
            if (!id || id == undefined || (!menuIds && !elementIds && !roleIds)) {
              this.error('参数有误');
              return;
            }
            const { service } = this;
            const result = yield service.user.user.menuRight(id, menuIds, elementIds, roleIds);
            if (result) { this.success(); } else { this.error(); }
        }
        /*
        *  获取用户权限配置
        * */
        * getUserRight(ctx) {
            const { token } = ctx.request.headers;
            if (!token) {
                this.error('没有权限', 401);
                return;
            }
            const { service } = this;
            const result = yield service.user.user.getUserRight(token);
            if (result.status)
                this.success(result.data);
            else
                this.error(result.msg)
        }
    }
    return UserController;
};
