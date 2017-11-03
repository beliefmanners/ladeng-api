module.exports = app => {
    class RoleController extends app.Controller {
        constructor(props) {
            super(props);
        }
        * findAll() {
            const { service } = this;
            let result = yield service.role.role.findAll();
            if (result.length)
                this.success(result);
            else
                this.error('没有查到相关数据');
        }
        * findRight(ctx) {
            const { service } = this;
            const { id } = ctx.query;
            if (!id) {
                this.error('参数有误');
                return;
            }
            let result = yield service.role.role.findRightById(id);
            this.success(result);
        }
        * configRole(ctx) {
            const { service } = this;
            let { id, name, key, description, menuIds, elementIds, status=1 } = ctx.request.body;
            status = this.parseStatus(status);
            let result;
            if (id) { // 更新
                let config = {
                    updateTime: new Date()
                };
                if(name) config.name = name;
                if(key) config.key = key;
                if(description) config.description = description;
                if(menuIds) config.menuIds = menuIds;
                if(elementIds) config.elementIds = elementIds;
                if(status) config.status = status;
                result = yield service.role.role.update(id,config);
            } else {
                if (!name || !key) {
                    this.error('参数有误');
                    return;
                } else {
                    let config = {
                        status: 1,
                        updateTime: new Date(),
                        createTime: new Date(),
                        name,
                        key
                    };
                    if(description) config.description = description;
                    if(menuIds) config.menuIds = menuIds;
                    if(elementIds) config.elementIds = elementIds;
                    result = yield service.role.role.add(config);
                }
            }

            if (result > 0)
                this.success();
            else
                this.error();
        }
    }
    return RoleController;
};
