'use strict';

module.exports = app => {
    class CommonService extends app.Service {
        constructor(props) {
            super(props);
            this.tableUserName = 'TW_user';
        }
        * baseSelect(tableName, field, where) {
            let result = yield this.knex(tableName).where(where || {}).column(field).select();
            if (result.length) {
                return {
                    status: true,
                    data: result
                }
            } else {
                return {
                    status: false,
                    msg: '没有查询到相关数据'
                }
            }
        }
        * update(tableName, field, where) {
            let result = yield  this.knex(tableName).update(field).where(where);
            return result > 0 ? true : false;
        }
        * add(tableName, field) {
            let result = yield this.knex(tableName).insert(field);
            return result[0];
        }
        * findUser(data) {
            let result = yield this.knex(this.tableUserName).where(data);
            if(result.length)
                return {
                    status: true,
                    data: result[0]
                };
            else
                return {
                    status: false,
                    msg: '没有查到相关数据'
                }
        }
        * isBackTag(projectBackId, tag) {
            let { token } = this.ctx.request.headers;
            let result = yield this.ctx.curl(`${this.baseUrl}/projects/${projectBackId}/repository/tags?private_token=${token}`,{
                method: 'GET',
                dataType: 'json'
            });
            if(result.status < 300){
                let arr = result.data;
                for (let i = 0; i<arr.length; i++) {
                    if(arr[i].name === tag) {
                        return {
                            status: true,
                            data: arr[i]
                        }
                    }
                }
                return {
                    status: false,
                    msg: `没有备份${tag}`
                }
            } else {
                return {
                    status: false,
                    msg: result.data.message
                }
            }
        }
        * like(tableName, selectField, {key,value}, where){
            let result = yield this.knex(tableName).select(selectField).where(where || {}).andWhere(key, 'like', `%${value}%`);
            if(result.length)
                return {
                    status: true,
                    data: result
                };
            else
                return {
                    status: false,
                    msg: '没有查到相关数据'
                }
        }
    }
    return CommonService;
};
