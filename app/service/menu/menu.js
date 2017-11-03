'use strict';

module.exports = app => {
  class MenuService extends app.Service{
      constructor(props) {
          super(props);
          this.menuField = ['id','name','icon','path','pId','description','sort','createTime','updateTime'];
      }
      * findAll() {
          let output = yield this.knex('TW_menu_right').select(this.menuField).where('status',1);
          return output;
      }
      * update(id, field) {
          let output = yield this.knex('TW_menu_right').update(field,this.menuField).where({id});
          return output;
      }
      * add(field) {
          let output = yield this.knex('TW_menu_right').returning(this.menuField).insert(field);
          return output[0];
      }
  };
  return MenuService;
};
