'use strict';
module.exports = app => {
    /*
    *  获取全部角色
    * */
    app.get('/api/role/findAll', app.controller.role.role.findAll);
    /*
    * 查询角色权限
    * @query id
    * */
    app.get('/api/role/findRoleRight', app.controller.role.role.findRight);
    /*
    *  更新\修改\删除
    *  @query id (非必填)  有id 更新 没有id 添加
    *  @query name
    *  @query key
    *  @query description
    *  @query menuIds
    *  @query elementIds
    * */
    app.post('/api/role/configRole', app.controller.role.role.configRole)
};
