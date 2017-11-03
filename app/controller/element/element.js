'use strict';

module.exports = app => {
    class EleController extends app.Controller {
        constructor(props) {
            super(props);
        }
        * findAll() {
            const { service } = this;
            let result = yield service.element.element.findAll();
            if (result.length)
                this.success(result);
            else
                this.error('没有查询到相关数据')
        }
        * configElement(ctx) {
            const { service } = this;
            let { id, key, name, icon, description, status } = ctx.request.body;
            status = this.parseStatus(status);
            let result;
            if (id) {
                if (!key && !name) {
                    this.error('参数有误');
                    return
                } else {
                    result = yield service.element.element.update(id,{
                        key,
                        name,
                        icon,
                        description,
                        status,
                        updateTime: new Date()
                    })
                }
            } else {
                if (!key || !name) {
                    this.error('参数有误');
                    return
                } else {
                    result = yield service.element.element.add({
                        key,
                        name,
                        icon,
                        description,
                        status,
                        createTime: new Date(),
                        updateTime: new Date()
                    })
                }
            }

            if (result > 0)
                this.success();
            else
                this.error();
        }
    }
    return EleController;
};

