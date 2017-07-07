passport-verify
===============

Passport-Verify is a passport.js plugin for authenticating with Verify Hub using passport.js and prototype-0 of Verify Service Provider.

__Terminology__
 * Identity Provider is a Service that can authenticate users
 * Relying party is a Service with a need to authenticate users
 * Verify Hub acts as an Identity Provider for Relying Parties
 * Verify Service Provider is a Service that consumes and produces SAML messages that can be used to communicate with Verify Hub https://github.com/alphagov/verify-service-provider/tree/master/prototypes/prototype-0/verify-service-provider
 * Passport.js is a node js library that provides a generic authentication framework for various authentication providers. http://passportjs.org/

Usage
-----

1. Install passport-verify
   ```bash
   npm install --save passport-verify
   ```

1. Install Verify Service Provider. https://github.com/alphagov/verify-service-provider/tree/master/prototypes/prototype-0/verify-service-provider

1. Configure passport-verify strategy for passport
   ```javascript
   const passportVerify = require('passport-verify')
   const bodyParser = require('body-parser')
   const fakeUserDataBase = new Set()

   // verify Service Provider dependes on a bodyParser to be configured as a middleware
   app.use(bodyParser.urlencoded({extended: false}))

   passport.use(passportVerify.createStrategy({
 
     verifyServiceProviderHost: 'http://localhost:50400',
 
     logger: console,
 
     // A callback for finding or creating the user from the application's database. See below for further definition.
     acceptUser: (user) => {
       if (user.attributes) {
         if (fakeUserDatabase[user.pid]) {
           throw new Error('User PID already exists')
         }
         fakeUserDatabase[user.pid] = Object.assign({id: user.pid}, user.attributes)
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
   app.post('/verify/response', (req, res, next) => {

     // call passport.authenticate-middleware with the request and provide a callback function that can
     // react to the various responses that can happen
     (passport.authenticate('verify', function (error, user, infoOrError, status) {
 
       if (error) {
         return res.render('error-page.njk', { error: error.message })
       }
 
       if (user) {
         return req.logIn(user, () => res.redirect('/'))
       }
 
       return res.render('authentication-failed-page.njk', { error: infoOrError })
 
     }))(req, res, next)

   })
   ```

   See https://github.com/alphagov/verify-service-provider/blob/master/prototypes/prototype-0/stub-rp/src/app.ts for
   a more detailed example with session support.

API
---

__passportVerify.createStrategy(options)__

Creates and configures a PassportVerifyStrategy that can be used for authentication with passport. The strategy instance should be passed to
`passport.use()`-method.

 * __options.verifyServiceProviderHost: string__

   The location of Verify Service Provider

 * __options.logger: object__

   An object that conforms to the typical logger api

 * __options.acceptUser: (user: VerifyServiceProviderUser) => User | boolean__

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

   A callback for finding or creating the user from the application's database. 
   The callback receives one parameter - `user`, which is an object from Verify that contains details of the authenticated user.
   The callback should return either a user object for the session or false if the user is not accepted by the service.

__passport.authenticate('verify', function callback (error, user, infoOrError, status) { ... })__

Typically passport.js is used to redirect the user to a new page after the authentication succeeds or fails.
While this can be done with passport-verify, it would be better to use a callback-method to catch the details of
why the user failed to authenticate and deal with it approppriately. (it is unfortunate that passport does not differentiate
between success and fail callbacks)

 * __error:__ `Error`

   An Error instance if an unexpected error has occurred

 * __user:__ `User | boolean`

   A User object returned by `options.acceptUser`-function. `false` if authentication has failed.

 * __infoOrError__: `VerifyServiceProviderUser | string | Symbol`

   Further details of the response.

   On success
   ```
   VerifyServiceProviderUser: object
   ```

   On Authentication Failure from Verify or Verify Service Provider
   ```
   BAD_REQUEST | 
   INTERNAL_SERVER_ERROR | 
   AUTHENTICATION_FAILED | 
   NO_MATCH | 
   CANCELLATION : string
   ```

   On `options.acceptUser` returning false

   ```
   passportVerify.USER_NOT_ACCEPTED_ERROR: Symbol
   ```

 * __status:__ `number`

   Response status code from Verify Service Provider.

   ```
   400 on Bad Request
   401 on Authentication Failed
   500 on Internal Server Error
   ```



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
yarn link
# In your application
yarn link passport-verify
```

