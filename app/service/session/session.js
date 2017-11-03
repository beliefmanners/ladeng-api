'use strict';
module.exports = app => {
    class SessionService extends app.Service{
        constructor(props) {
            super(props);
            this.userTable = 'TW_user';
            this.userField = ['id','userName','email','name','avatarUrl','token','createTime','loginCurrentTime','loginLastTime','loginCount'];
        }
        * chexkLogin(userName, password) {
            let result;
            try {
                result =yield this.ctx.curl(`${this.baseUrl}/session`,{
                    method: 'POST',
                    dataType: 'json',
                    data: {
                        login: userName,
                        password
                    }
                });
            } catch (err) {
                return {
                    status: 500
                }
            }

            return {
                data: result.data,
                status: result.status
            };
        }
        * checkUserIsExit(userId) {
            let result = yield this.knex(this.userTable).select('*').where({id:userId});
            if(result.length)
                return {
                    status: true,
                    data: result[0]
                };
            else
                return {
                    status: false
                }
        }
        * saveUserInfo1 (obj) {
            let baseField = {
                userName: obj.username,
                name: obj.name,
                email: obj.email,
                avatarUrl: obj.avatar_url,
                loginCurrentTime: new Date(obj.current_sign_in_at),
                loginLastTime: new Date(obj.last_sign_in_at),
                token: obj.private_token
            };
            let config = {
                elementIds: obj.elementIds || '',
                menuIds: obj.menuIds || '',
                roleIds: obj.roleIds || '',
                id: obj.id,
                status: 1,
                loginCount: 1,
                password: obj.password,
                createTime: new Date(obj.created_at)
            };
            yield this.knex(this.userTable).insert(Object.assign({},baseField,config));
            return {
                status: true,
                data: Object.assign({}, baseField, {
                    loginCount: 1,
                    id: obj.id
                })
            };
        }
        * updateUserInfo(obj) {
            let baseField = {
                userName: obj.username,
                name: obj.name,
                email: obj.email,
                avatarUrl: obj.avatar_url,
                loginCurrentTime: new Date(obj.current_sign_in_at),
                loginLastTime: new Date(obj.last_sign_in_at),
                token: obj.private_token,
                loginCount: obj.loginCount + 1
            };
            yield this.knex(this.userTable).update(baseField).where({id: obj.id});
            return {
                status: true,
                data: Object.assign({}, baseField, {id: obj.id})
            }
        }
        * checkToken(token) {
            let result;
            try {
                result= yield this.ctx.curl(`${this.baseUrl}/users?private_token=${token}`,{
                    method: 'GET',
                    dataType:"json"
                });
            } catch (err) {
                return {
                    status: false,
                    msg: '检查登录失败'
                }
            }

            let userInfo = yield this.knex(this.userTable).select(this.userField).where({
                token
            });
            if (result.status > 300 || !userInfo[0]) {
                return {
                    status: false,
                    msg: '检查登录失败'
                }
            } else {
                yield this.knex(this.userTable).update({
                    token: userInfo[0].token,
                    loginCount: userInfo[0].loginCount + 1,
                }).where({
                    id: userInfo[0].id
                });
                return {
                    status: true,
                    data: Object.assign({},userInfo[0],{
                        loginCount: userInfo[0].loginCount + 1
                    })
                }
            }

        }
    }
    return SessionService;
};
