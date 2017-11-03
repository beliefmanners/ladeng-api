'use strict';
module.exports = app => {
  /*
  *  获取所有 菜单
  * */
  app.get('/api/menu/findAll', app.controller.menu.menu.findAll);
  /*
  * 添加 或者 更新 菜单
  * @menthod { POST }
  * @query id (非必填)  有id 更新 没有id 添加
  * @query name        名字
  * @query icon        icon
  * @query path        路由地址
  * @query pId         父菜单id
  * @query description 描述
  * @query sort        排序
  * @query status      显示状态
  * */
  app.post('/api/menu/configMenu', app.controller.menu.menu.configMenu)
};
