'use strict';

module.exports = app => {
  class EleService extends app.Service {
      constructor(props) {
          super(props);
          this.eleField = ['id','name','icon','key','description','createTime','updateTime'];
          this.tableName = 'TW_element_right';
      }
      * findAll() {
          let output = yield this.knex(this.tableName).select(this.eleField);
          return output;
      }
      * update(id, field) {
        let output = yield this.knex(this.tableName).update(field).where({id});
        return output;
      }
      * add(field) {
        let output = yield this.knex(this.tableName).insert(field);
        return output[0];
      }
  }
  return EleService;
};
