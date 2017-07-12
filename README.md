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

   passport.use(passportVerify.createStrategy({

     verifyServiceProviderHost: 'http://localhost:50400',

     logger: console,

     // A callback for a new user authentication.
     // This function is called at the end of the authentication flow
     // with a user user object that contains details of the user in attributes.
     // it should either return a user object or false if the user is not
     // accepted by the application for whatever reason. It can also return a
     // Promise in case it is asynchronous.
     createUser: (user) => {

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
     verifyUser: (user) => {

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
   }))
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
---

__passportVerify.createStrategy(options): PassportVerifyStrategy__

Creates and configures a `PassportVerifyStrategy` that can be used for authentication with passport. The strategy instance should be passed to
`passport.use()`-method.

 * __options.verifyServiceProviderHost: string__

   The location of Verify Service Provider

 * __options.logger: object__

   An object that conforms to the typical logger api

 * __options.createUser: (user: VerifyServiceProviderUser) => User | boolean__

   ```javascript
   VerifyServiceProviderUser: {
     pid: string,
     levelOfAssurance: string(LEVEL_1 | LEVEL_2 | LEVEL_3),
     attributes: {
       surnameVerified: boolean,
       firstName: string,
       address: {
         internationalPostCode: string
         uprn: string,
         verified: boolean,
         postCode: string,
         lines: string[]
       },
       surname: string,
       middleName: string,
       dateOfBirth: ISO8601String,
       cycle3: string,
       middleNameVerified: boolean,
       dateOfBirthVerified: boolean,
       firstNameVerified: boolean
     }
   }
   ```

   A callback for creating the user to the application's database.
   The callback receives one parameter - `user`, which is an object from Verify that contains details of the authenticated user.
   The callback should return either a user object for the session or false if the user is not accepted by the service.
   The callback can also return a Promise of a user.

 * __options.verifyUser: (user: VerifyServiceProviderUser) => User | boolean__

   ```javascript
   VerifyServiceProviderUser: {
     pid: string,
     levelOfAssurance: string(LEVEL_1 | LEVEL_2 | LEVEL_3)
   }
   ```

   A callback for creating the user to the application's database.
   The callback receives one parameter - `user`, which is an object from Verify that contains details of the authenticated user.
   The callback should return either a user object for the session or false if the user is not accepted by the service.
   The callback can also return a Promise of a user.

__passport.authenticate('verify', function callback (error, user, infoOrError, status) { ... })__

Typically passport.js is used to redirect the user to a new page after the authentication succeeds or fails.
While this can be done with passport-verify, it would be better to use a callback-method to catch the details of
why the user failed to authenticate and deal with it approppriately.

It is recommended that you use `passportVerify.createResponseHandler()` to handle this callback as follows:

```javascript
app.post('/verify/response', (req, res, next) => (
  passport.authenticate('verify',
    passportVerify.createResponseHandler({
      onMatch:
        user => /**/,
      onCreateUser:
        user => /**/,
      onAuthnFailed:
        failure => /**/,
      onError:
        error => /**/,
    })
  )
)(req, res, next))
```

Note that the callbacks are defined inside a closure that has access to `req`, `res`, and `next` so your callbacks
can log the user in / redirect etc.

__passportVerify.createResponseHandler({ onMatch: ..., onCreateUser: ..., onAuthnFailed: ..., onError: ... })__

To make handling the `passport.authenticate()` callback easier we provide a `createResponseHandler` function.
This takes separate callbacks for each of the response scenarios you have to handle and returns a function that
will call the appropriate callback when called by passport.

 * __onMatch:__

   Called when handling a success response from a user that was matched by your matching service. Your callback
   should redirect the user to the appropriate page so they can begin using your service.

 * __onCreateUser:__

   Called when handling a success response from a user that was not matched by your matching service, but who
   has had a new account created. Your callback should redirect the user to the appropriate page so they can
   begin using your service (you may or may not want to treat new users differently to existing users).

 * __onAuthnFailed:__

   Called when the user failed to authenticate in a non-erroneous way. For example if the user clicked cancel
   or got their password wrong. Your callback should redirect the user to a page offering them other ways to
   use your service (e.g. using a non-verify way of proving their identity or going somewhere in person).

 * __onError:__

   Called when the response from verify can't be handled correctly (for example if its signature is invalid or
   if its validUntil date is in the past). Your callback should render an error page telling the user that
   there are technical problems with Verify.

Development
-----------

passport-verify uses `yarn` to manage dependencies. See https://yarnpkg.com/en/

__Install the dependencies__
```
yarn install
```

__Compile and test the code__
```
./pre-commit.sh
```

If you're making changes to passport-verify which you need to test in another application
it may be more convenient to "link" the projects (rather than copying the entire directory in).

```
# In passport-verify
cd ./passport-verify
yarn link
# In your application
cd ./some-application
yarn link passport-verify
```

