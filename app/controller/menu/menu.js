'use strict';

module.exports = app => {
    class MenuController extends app.Controller{
        constructor(props) {
            super(props);
        }
        * findAll() {
            const { service } = this;
            const result = yield service.menu.menu.findAll();

            if (result.length)
                this.success(result);
            else
                this.error('没有查询到相关数据', 200, []);
        }
        * configMenu(ctx) {
            const { service } = this;
            let { id, name, icon, path, pId, description, sort, status = 1 } = ctx.request.body;
            pId = parseInt(pId) || 0;
            if (typeof status === 'string' && status) {
                try {
                    status = JSON.parse(status)?1 : 0;
                } catch (err){
                    status = 0;
                }
            } else {
                status = 1
            }
            let result;
            if (id){ // 更新\修改 菜单配置
                if (!name && !icon && !path){
                    this.error('参数有误');
                    return;
                } else {
                    result = yield service.menu.menu.update(id,{
                        name,
                        icon,
                        path,
                        pId,
                        status,
                        description,
                        sort,
                        updateTime: new Date()
                    });
                }
            } else {
                if(!name || !icon || !path){
                    this.error('参数有误');
                    return;
                } else {
                    result = yield service.menu.menu.add({
                        name,
                        icon,
                        path,
                        pId,
                        status,
                        description,
                        sort,
                        updateTime: new Date(),
                        createTime: new Date()
                    });
                }
            }
            if (result > 0)
                this.success();
            else
                this.error('没有查询到相关数据');

        }
    }
    return MenuController;
};
