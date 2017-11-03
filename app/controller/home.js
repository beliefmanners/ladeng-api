'use strict';

module.exports = app => {
  class HomeController extends app.Controller {
    constructor(props) {
      super(props);
    }
    * index(ctx) {
      let {body} = ctx.request;
      console.log(body);
      ctx.body = {
        hello: 'world'
      };
    }
  }
  return HomeController;
};
