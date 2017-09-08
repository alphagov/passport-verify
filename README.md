passport-verify
===============

[![Greenkeeper badge](https://badges.greenkeeper.io/alphagov/passport-verify.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/alphagov/passport-verify.svg?branch=master)](https://travis-ci.org/alphagov/passport-verify) [![Known Vulnerabilities](https://snyk.io/test/github/alphagov/passport-verify/badge.svg)](https://snyk.io/test/github/alphagov/passport-verify)

`passport-verify` is the best way to integrate with GOV.UK Verify if you are using node and [passport.js](http://passportjs.org/).

Status
---------------

**This project is in the discovery phase and is not ready for use in production.**

Usage
-----

1. Install `passport-verify`
   ```bash
   npm install --save passport-verify
   ```

1. Install [Verify Service Provider](https://github.com/alphagov/verify-service-provider).

1. Configure `passport-verify` [strategy](http://passportjs.org/docs/configure#strategies).

   See [createStrategy](https://alphagov.github.io/passport-verify/modules/_passport_verify_strategy_.html#createstrategy) in the API documentation.
   ```javascript
   const passportVerify = require('passport-verify')
   const bodyParser = require('body-parser')

   // Real applications should have a real backend for storing users.
   const fakeUserDatabase = {}

   // Passport-Verify dependes on any bodyParser
   // to be configured as a middleware.
   app.use(bodyParser.urlencoded({extended: false}))

   passport.use(passportVerify.createStrategy(

     // verifyServiceProviderHost
     'http://localhost:50400',

     // A callback for a new user authentication.
     // This function is called at the end of the authentication flow
     // with a user user object that contains details of the user in attributes.
     // it should either return a user object or false if the user is not
     // accepted by the application for whatever reason. It can also return a
     // Promise in case it is asynchronous.
     function createUser (user) {

       // This should be an error case if the local matching strategy is
       // done correctly.
       if (fakeUserDatabase[user.pid]) {
         throw new Error(
           'Local matching strategy has defined ' +
           'the user to be new to the application, ' +
           'but the User PID already exists.')
       }

       fakeUserDatabase[user.pid] = Object.assign({id: user.pid}, user.attributes)
       return Object.assign({ levelOfAssurence: user.levelOfAssurance }, fakeUserDatabase[user.pid])
     },

     // A callback for an existing user authentication.
     // This function is called at the end of the authentication flow with
     // an object that contains the user pid. 
     // The function should either return a user object or false if the user is not
     // accepted by the application for whatever reason. It can also return a
     // Promise in case it is asynchronous.
     function verifyUser (user) {

       // This should be an error case if the local matching strategy is
       // done correctly.
       if (!fakeUserDatabase[user.pid]) {
         throw new Error(
           'Local matching strategy has defined ' +
           'that the user exists, but the PID could ' +
           'not be found in the database.')
       }

       return Object.assign({ levelOfAssurence: user.levelOfAssurance }, fakeUserDatabase[user.pid])
     },

    // A callback that saves the unique request ID associated with the SAML messages
    // to the user's session.
    // This function is called after the Verify Service Provider has generated and
    // returned the AuthnRequest and associated RequestID.
    // The requestID should be saved in a secure manner, and such that it
    // corresponds to the user's current session and can be retrieved in order to validate
    // that SAML response that is returned from the IDP corresponds to the original AuthnRequest.
    function saveRequestId (requestId: string, request: any) {

      // The following is an example that saves the requestId using the express-session middleware
      // This would require express-session to be initialised with a secure secret e.g:

      // const session = require('express-session')
      //
      // app.use(session({
      //  secret: 'super secret secure token',
      //  resave: true,
      //  saveUninitialized: true
      // }))

      request.session.requestId = requestId
    },

    // A callback that returns the requestId that corresponds to the user's session.
    // This is used by the Verify Service Provider to ensure SAMLResponses received from IDPS
    // correspond to a the user's active session.
    function loadRequestId (request: any) {

      // The following is an example that retrieves the request ID from the aforementioned 
      // express-session object.
      return request.session.requestId
    }
   ))
   ```

1. Configure routes for the authentication flow

   See [createResponseHandler](https://alphagov.github.io/passport-verify/modules/_create_response_handler_.html#createresponsehandler) 
   and its [callbacks](https://alphagov.github.io/passport-verify/interfaces/_create_response_handler_.responsescenarios.html#onauthnfailed) in the API documentation.

   ```javascript
   // route for authenticating a user
   app.post('/verify/start', passport.authenticate('verify'))

   // route for handling a callback from verify
   app.post('/verify/response', (req, res, next) => (
   
     // in this example, authenticate() is being called from within the route handler
     // rather than being used as middleware, this provides access to the request
     // and response objects through closure
     const authMiddleware = passport.authenticate('verify', function (error, user, infoOrError, status) {

      if (error) {
        return res.send(`TODO: render error-page with message ${error: error.message}`)
      }

      if (user) {
        // passport-verify requires the use of a custom callback to handle successful
        // authentication
        return req.logIn(user, () => res.send('TODO: redirect to service landing page')))
      }

      return res.send(`TODO: redirect to authentication failed page with ${error: infoOrError}`)

    })
    authMiddleware(req, res, next)
   ```

   See [the example implementation](https://github.com/alphagov/passport-verify-stub-relying-party/blob/master/src/app.ts) for
   a more detailed example with session support.

Logging
-----------
`passport-verify` uses the [_debug_](https://www.npmjs.com/package/debug) package for logging, using `passport-verify:log` for infomation and `passport-verify:requests` to log api requests sent.

The package enables logging based on the environment variable `DEBUG`.
To enable logs, set this variable;
* For just information level logging, use `passport-verify:log`
* For request logging, use `passport-verify:requests`
* For both, use `passport-verify:*`

If you are using this package for your application, note that the `DEBUG` variable will be read as a comma seperated list, so you can add or remove passport-verify logs as necessary without changing your own.

API
-----------

See [the API documentation](https://alphagov.github.io/passport-verify/modules/_passport_verify_.html) for more details.

Terminology
---------------

 * _Identity Provider_ is a Service that can authenticate users
 * _Relying party_ is a Service that needs to authenticate users
 * [_Verify Service Provider_](https://github.com/alphagov/verify-service-provider)
    is a service that consumes and produces SAML messages that can be used to communicate with GOV.UK Verify
 * [_Passport.js_](http://passportjs.org/) is a node js library that provides a generic authentication framework for various authentication providers. 


Development
-----------

If you want to make changes to `passport-verify` itself, fork the repository then:

__Install the dependencies__
```
npm install
```

__Compile and test the code__
```
./pre-commit.sh
```
