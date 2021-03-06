var Fiber = Npm.require('fibers');

_.extend(FastRender, {
  _routes: [],
  _onAllRoutes: []
});

FastRender.route = function route(path, callback) {
  var keys = [];
  FastRender._routes.push({
    regexp: Utils._pathRegexp(path, keys, false, false),
    callback: callback,
    keys: keys
  });
};

FastRender.onAllRoutes = function onAllRoutes(callback) {
  FastRender._onAllRoutes.push(callback);
};

FastRender._processRoutes = function _processRoutes(path, loginToken, headers, callback) {
  var selectedRoute;
  var params;

  for(var lc=0; lc<FastRender._routes.length; lc++) {
    var route = FastRender._routes[lc];
    params = Utils._pathMatch(path, route);
    if(params) {
      selectedRoute = route;
      break;
    }
  }

  Fiber(function() {
    var context = new Context(loginToken, { headers: headers });
    try {

      //run onAllRoutes callbacks if provided
      FastRender._onAllRoutes.forEach(function(callback) {
        callback.call(context, path);
      });

      if(selectedRoute) {
        selectedRoute.callback.call(context, params, path);
      }

      callback(context.getData());
    } catch(err) {
      console.error('error on fast-rendering path: ' + path + " ; error: " + err.stack);
      callback(null);
    }
  }).run();
};

// adding support for null publications
FastRender.onAllRoutes(function() {
  var context = this;
  var nullHandlers = Meteor.default_server.universal_publish_handlers;
  
  if(nullHandlers && nullHandlers) {
    nullHandlers.forEach(function(publishHandler) {
      var publishContext = new PublishContext(context, null);
      var params = [];
      context.processPublication(publishHandler, publishContext, params);
    });
  }
});