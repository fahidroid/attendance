var coffee = require('coffee-script');
var express = require('express');
var everyauth = require('everyauth');
var mongoose = require('mongoose');

var conf = require('./conf');

var routes = require('./routes');

var models = require('./lib/models');
var auth = require('./lib/auth');

mongoose.connect(conf.mongo.uri);

everyauth.password
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login')
    .authenticate(auth.authenticate)
    .loginLocals(function(req, res) {
        return {
            next: req.query.next
        };
    })
    .respondToLoginSucceed(auth.respondToLoginSucceed)
    .registerLocals(function(req, res) {
        return {
            next: req.query.next
        };
    })
    .respondToRegistrationSucceed(auth.respondToRegistrationSucceed)
    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register')
    .extractExtraRegistrationParams(function (req) {
        return {
            userParams: req.body.userParams,
        };
    })
    .validateRegistration(auth.validateRegistration)
    .registerUser(auth.registerUser);

var app = module.exports = express.createServer();

everyauth.helpExpress(app);

// Configuration

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
});

app.configure('development', function() {
    app.use(express.session({
        secret: conf.session.secret,
    }));
});

app.configure('production', function() {
    var MongoStore = require('connect-mongodb');
    var oneWeek = 60 * 60 * 24 * 7;
    app.use(express.session({
        secret: conf.session.secret,
        store: new MongoStore({
          db: mongoose.connections[0].db,
          reapInterval: oneWeek,
        }),
        cookie: {
            maxAge: oneWeek * 1000, // milliseconds
        },
    }));
});

app.configure(function() {
    app.use(express.csrf());
    app.use(everyauth.middleware());
    app.use(auth.middleware());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler({ dumpExceptions: true}));
});


app.dynamicHelpers({
    user: function(req, res) {
        return req.user;
    },
    messages: require('./lib/bootstrap2-messages'),
    req: function(req, res) {
        return req;
    },
    md: function(req, res) {
        return require('marked');
    },
    alcohol: function(req, res) {
        return require('./lib/alcohol').stringify;
    },
});

// Routes

routes.registerOn(app);

app.listen(conf.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
console.log(process.env.MONGOLAB_URI);
