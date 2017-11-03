'use strict';

module.exports = app => {
  /*
    *  @router { get } 获取所有用户
    * */
  app.get('/api/user/findAll', app.controller.user.user.findAll);
  /*
    *  @router { get } 查询某个用户的授权 状况
    *  @query id 用户id
    * */
  app.get('/api/user/findById', app.controller.user.user.findById);
  /*
    *  @router { get } 激活某个用户
    *  @query id 用户 id
    * */
  app.get('/api/user/active', app.controller.user.user.activeUser);
  /*
    * @router { post } 配置菜单权限
    * @query id 用户id
    * @query menuIds 菜单ids
    * @query elementIds 页面元素ids
    * @query roleids 角色ids
    * */
  app.post('/api/user/configRight', app.controller.user.user.configRight);
  /*
  *  @router { get } 获取权限配置
  *  @query token 用户
  * */
  app.get('/api/user/getUserRight', app.controller.user.user.getUserRight)
};
