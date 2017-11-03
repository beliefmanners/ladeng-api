'use strict';

module.exports = app => {
    class User extends app.Service {
        constructor(props) {
            super(props);
            this.tableUserName = 'TW_user';
            this.tableMenuName = 'TW_menu_right';
            this.tableRoleName = 'TW_role';
            this.tableEleName  = 'TW_element_right';
            this.userField = [ 'id', 'userName', 'name', 'avatarUrl', 'email', 'status', 'loginCount', 'createTime', 'loginLastTime' ];
            this.userRightField = ['roleIds','elementIds','menuIds'];
            this.menuField = ['id','name','icon','path','pId','description','sort','createTime','updateTime'];
            this.eleField = ['id','name','icon','key','description','createTime','updateTime'];
        }
        * findAll() {
            const result = yield this.knex(this.tableUserName).select(this.userField);
            result.map(val => {
              if (val.status) { val.status = true; } else { val.status = false; }
              return val;
            });
            return result;
        }
        * findById(id) {
            const field = [ 'roleIds', 'elementIds', 'menuIds' ];
            const output = {};
            let result = yield this.knex('TW_user').select(field).where({
              id,
              status: 1,
            });
            if (!result.length) {
              output.status = false;
              output.msg = '该用户尚未激活';
              return output;
            }
            result = result[0];
            let { roleIds, elementIds, menuIds } = result;
            if (roleIds) { roleIds = yield this.knex('TW_role').select().whereIn('id', roleIds.split(',')); }
            if (elementIds) { elementIds = yield this.knex('TW_element_right').select().whereIn('id', elementIds.split(',')); }
            if (menuIds) { menuIds = yield this.knex('TW_menu_right').select().whereIn('id', menuIds.split(',')); }
            return {
              data: {
                role: roleIds || [],
                element: elementIds || [],
                menu: menuIds || [],
              },
              status: true,
            };
        }
        * activeById(id, status) {
            let result = yield this.knex('TW_user').update({ status }).where('id', id);
            return result;
        }
        * menuRight(id, menuIds, elementIds, roleIds) {
            let result = yield this.knex('TW_user').update({ menuIds, elementIds, roleIds }).where('id', id);
            return result;
        }
        * getUserRight(token) {
            let result = yield this.knex(this.tableUserName).select(this.userRightField).where({token,status: 1});
            if (result[0]) {
                let menuArr = [], eleArr = [];
                let { roleIds, elementIds, menuIds } = result[0];
                if (roleIds) {
                    let roleInfo = yield this.knex(this.tableRoleName).select(['menuIds','elementIds']).whereIn('id',roleIds.split(','));
                    roleInfo.map((val) => {
                        if (val.menuIds) {
                            menuArr = menuArr.concat(val.menuIds.split(','))
                        }
                        if (val.elementIds) {
                            eleArr = eleArr.concat(val.elementIds.split(','))
                        }
                    })
                }
                if (elementIds) {
                    eleArr = eleArr.concat(elementIds.split(','))
                }
                if (menuIds) {
                    menuArr = menuArr.concat(menuIds.split(','))
                }
                let element = yield this.knex(this.tableEleName).select(this.eleField).whereIn('id', eleArr);
                let menu    = yield this.knex(this.tableMenuName).select(this.menuField).whereIn('id', menuArr);
                return {
                    status: true,
                    data: {
                        element: element,
                        menu: menu
                    }
                }
            } else {
                return {
                    status: false,
                    msg: '该用户被禁止，请求管理激活账户'
                }
            }
        }
    }
    return User;
};

