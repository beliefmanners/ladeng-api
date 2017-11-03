'use strict';
module.exports = app =>{
    /*
    *  获取所有 菜单
    * */
    app.get('/api/element/findAll', app.controller.element.element.findAll);
    /*
    * 添加 或者 更新 菜单
    * @menthod { POST }
    * @query id (非必填)  有id 更新 没有id 添加
    * @query name        名字
    * @query icon        icon
    * @query key         该页面元素的关键字
    * @query description 描述
    * @query status      显示状态
    * */
    app.post('/api/element/configElement', app.controller.element.element.configElement)
};
