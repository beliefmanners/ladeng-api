module.exports = app => {
    class RoleService extends app.Service {
        constructor(props) {
            super(props);
            this.tableName = 'TW_role';
            this.tableMenuName = 'TW_menu_right';
            this.tableElementName = 'TW_element_right';
            this.roleField = ['id', 'name','key','description','createTime','updateTime'];
            this.roleRightField = ['menuIds','elementIds'];
            this.menuField = ['id','name','icon','path','pId','description','sort','createTime','updateTime'];
            this.elementField = ['id','name','icon','key','description','createTime','updateTime'];
        }
        * findAll() {
            let output = yield this.knex(this.tableName).select(this.roleField).where('status', 1);
            return output;
        }
        * findRightById(id) {
            let output = yield this.knex(this.tableName).select(this.roleRightField).where({id});
            let {menuIds, elementIds} = output[0];
            if (menuIds) {
                menuIds = yield this.knex(this.tableMenuName).select(this.menuField).whereIn('id', menuIds.split(','))
            }
            if (elementIds) {
                elementIds = yield this.knex(this.tableElementName).select(this.elementField).whereIn('id', elementIds.split(','))
            }
            return {
                menu: menuIds || [],
                element: elementIds || []
            };
        }
        * add(field) {
            let output = yield this.knex(this.tableName).insert(field);
            return output;
        }
        * update(id, field) {
            let output = yield this.knex(this.tableName).update(field).where({id});
            return output;
        }
    }
    return RoleService;
};
