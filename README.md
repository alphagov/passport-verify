passport-verify
===============

[![Build Status](https://travis-ci.org/alphagov/passport-verify.svg?branch=master)](https://travis-ci.org/alphagov/passport-verify)

Passport-Verify is a passport.js plugin for authenticating with Verify Hub using passport.js and prototype-0 of Verify Service Provider.

Status
---------------

**This project is in the discovery phase and is not ready for use in production.**

Terminology
---------------

 * _Identity Provider_ is a Service that can authenticate users
 * _Relying party_ is a Service that needs to authenticate users
 * _Verify Hub_ acts as an Identity Provider for Relying Parties
 * _Verify Service Provider_ is a Service that consumes and produces SAML messages that can be used to communicate with Verify Hub https://github.com/alphagov/verify-service-provider/tree/master/prototypes/prototype-0/verify-service-provider
 * _Passport.js_ is a node js library that provides a generic authentication framework for various authentication providers. http://passportjs.org/

Usage
-----

1. Install passport-verify
   ```bash
   npm install --save passport-verify
   ```

1. Install Verify Service Provider. https://github.com/alphagov/verify-service-provider/tree/master/prototypes/prototype-0/verify-service-provider

1. Configure passport-verify strategy
   ```javascript
   const passportVerify = require('passport-verify')
   const bodyParser = require('body-parser')

   // Real applications should have a real backend for storing users.
   const fakeUserDataBase = {}

   // Passport-Verify dependes on any bodyParser
   // to be configured as a middleware.
   app.use(bodyParser.urlencoded({extended: false}))

   passport.use(passportVerify.createStrategy(

     // verifyServiceProviderHost
     'http://localhost:50400',

     // logger
     console,

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
     }
   ))
   ```

1. Configure routes for the authentication flow
   ```javascript
   // route for authenticating a user
   app.post('/verify/start', passport.authenticate('verify'))

   // route for handling a callback from verify
   app.post('/verify/response', (req, res, next) => (
     passport.authenticate('verify',
       passportVerify.createResponseHandler({
         onMatch:
           user => req.logIn(user, () => res.redirect('/service-landing-page')),
         onCreateUser:
           user => req.logIn(user, () => res.redirect('/service-landing-page')),
         onAuthnFailed:
           failure => res.render('authentication-failed-page.njk', { error: failure }),
         onError:
           error => res.render('error-page.njk', { error: error.message })
       })
     )
   )(req, res, next))
   ```

   See https://github.com/alphagov/verify-service-provider/blob/master/prototypes/prototype-0/stub-rp/src/app.ts for
   a more detailed example with session support.
API
-----------

See [the API documentation](https://alphagov.github.io/passport-verify/modules/_passport_verify_.html) for more details.

Development
-----------

__Install the dependencies__
```
npm install
```

__Compile and test the code__
```
./pre-commit.sh
```

To make changes to passport-verify which may need to be tested in another application:
"Link" projects, rather than copying the entire directory in:

```
# In passport-verify
cd ./passport-verify
npm link
# In your application
cd ./some-application
npm link passport-verify
```

