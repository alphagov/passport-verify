# passport-verify


[![Build Status](https://travis-ci.org/alphagov/passport-verify.svg?branch=master)](https://travis-ci.org/alphagov/passport-verify)
[![Known Vulnerabilities](https://snyk.io/test/github/alphagov/passport-verify/badge.svg)](https://snyk.io/test/github/alphagov/passport-verify)
[![Greenkeeper badge](https://badges.greenkeeper.io/alphagov/passport-verify.svg)](https://greenkeeper.io/)

`passport-verify` is a Node.js and [Passport.js](http://passportjs.org/) client for the [Verify Service Provider (VSP)](https://github.com/alphagov/verify-service-provider).

## Before you start

[Set up the VSP](https://github.com/alphagov/verify-service-provider/README.md).

## Usage

### Step 1. Install `passport-verify`

```bash
npm install --save passport-verify
```

### Step 2. Configure the `passport-verify` strategy

Use the `createIdentityStrategy` method to create a strategy when configuring passport.js. For more information about the method, see the [API documentation for `createIdentityStrategy`](https://alphagov.github.io/passport-verify/modules/_passport_verify_strategy_.html#createidentitystrategy).

The code block shows an example of how to [configure the `passport-verify` strategy](http://passportjs.org/docs/configure#strategies).

```javascript
const passportVerify = require('passport-verify')
const bodyParser = require('body-parser')

// Real applications should have a real backend for storing users.
const fakeUserDatabase = {}

// Passport-Verify dependes on any bodyParser
// to be configured as a middleware.
app.use(bodyParser.urlencoded({extended: false}))

passport.use(passportVerify.createIdentityStrategy(

 // verifyServiceProviderHost
 'http://localhost:50400',

 // A callback for an identity authentication.
 // This function is called at the end of the authentication flow
 // with a user object that contains details of the user in attributes.
 // it should either return a user object or false if the user is not
 // accepted by the application for whatever reason. It can also return a
 // Promise in case it is asynchronous.
 function handleIdentity (identity) {

   // This should be an error case if the local matching strategy is
   // done correctly.
   if (fakeUserDatabase[user.pid]) {
     throw new Error(
       'Local matching strategy has defined ' +
       'the user to be new to the application, ' +
       'but the User PID already exists.')
   }

   fakeUserDatabase[user.pid] = Object.assign({id: identity.pid}, identity.attributes)
   return Object.assign({ levelOfAssurance: identity.levelOfAssurance }, fakeUserDatabase[identity.pid])
 },

// A callback that saves the unique request ID associated with the SAML messages
// to the user's session.
// This function is called after the Verify Service Provider has generated and
// returned the AuthnRequest and associated RequestID.
// The requestID should be saved in a secure manner, and such that it
// corresponds to the user's current session and can be retrieved in order to validate
// that SAML response that is returned from the IDP corresponds to the original AuthnRequest.
function saveRequestId (requestId, request) {

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
function loadRequestId (request) {

  // The following is an example that retrieves the request ID from the aforementioned
  // express-session object.
  return request.session.requestId
},
// Service Entity Id
'http://your-service-entity-id'
// This is only required when your Verify Service Provider is set up to be multi tenanted.
// If it is provided, it is passed to the Verify Service Provider with each request, and
// used to identify this service.

// Saml Form Template Location
'saml-form-template.njk',
// This is an optional parameter which can be used to style the saml form
// used to send the authn request to Verify.
// This template should only be rendered if Javascript has been disabled in the user's browser.
// If provided, the ssoLocation and samlRequest recieved from the Verify Service Provider
// will be provided to the named template for rendering.
// If this is not provided, passport-verify will render a default auto posting form
// with the correct attributes.

// Level of Assurance
// LEVEL_1 or LEVEL2 depending on your service's requirements. Defaults to LEVEL_2.
'LEVEL_2'
))
```

If your service uses Matching Service Adapter, you should use the `createStrategy` method to create a strategy when configuring passport.js. See the [API documentation for the createStrategy method](https://alphagov.github.io/passport-verify/modules/_passport_verify_strategy_.html#createstrategy) for more details.

### Step 3. Configure routes for the authentication flow

Use the `createIdentityResponseHandler` method to configure the routes for the authentication flow.

See the API documentation for more details about the [`createIdentityResponseHandler` method](https://alphagov.github.io/passport-verify/modules/_create_identity_response_handler_.html#createidentityresponsehandler)
and its [callbacks](https://alphagov.github.io/passport-verify/interfaces/_create_identity_response_handler_.responsescenarios.html).

The exact routes depend on how you plan on using the responses from GOV.UK Verify Hub. The example in the code block configures a route to allow a verified user to access the service:

```javascript

// route for authenticating a user
app.post('/verify/start', passport.authenticate('verify'))

// route for handling a callback from verify
app.post('/verify/response', (req, res, next) => (

   // in this example, authenticate() is being called from within the route handler
   // rather than being used as middleware, this provides access to the request
   // and response objects through closure
   const authMiddleware = passport.authenticate('verify', function (error, identity, infoOrError, status) {

    if (error) {
      return res.send(`TODO: render error-page with message ${error: error.message}`)
    }

    if (identity) {
      // passport-verify requires the use of a custom callback to handle successful
      // authentication
      return req.logIn(identity, () => res.send('TODO: redirect to service landing page')))
    }

    return res.send(`TODO: redirect to authentication failed page with ${error: infoOrError}`)

  })
  authMiddleware(req, res, next)
```

If your service uses a Matching Service Adapter, you should use the `createResponseHandler` method to configure routes for the authentication flow. See the API documentation for more details about the [`createResponseHandler` method](https://alphagov.github.io/passport-verify/modules/_create_response_handler_.html#createresponsehandler)
and its [callbacks](https://alphagov.github.io/passport-verify/interfaces/_create_response_handler_.responsescenarios.html#onauthnfailed).

For a more detailed example with session support, see [the example implementation](https://github.com/alphagov/passport-verify-stub-relying-party/blob/master/src/app.ts).

## Logging

`passport-verify` uses the [_debug_](https://www.npmjs.com/package/debug) package for logging, using `passport-verify:log` for infomation and `passport-verify:requests` to log api requests sent.

The package enables logging based on the environment variable `DEBUG`.
To enable logs, set this variable;
* For just information level logging, use `passport-verify:log`
* For request logging, use `passport-verify:requests`
* For both, use `passport-verify:*`

If you are using this package for your application, note that the `DEBUG` variable will be read as a comma seperated list, so you can add or remove passport-verify logs as necessary without changing your own.

## API


See [the API documentation](https://alphagov.github.io/passport-verify/modules/_passport_verify_.html) for more details.

## Terminology

 * _Identity Provider_ is a service that can authenticate users
 * _Relying party_ is a service that needs to authenticate users
 * [_Verify Service Provider_](https://github.com/alphagov/verify-service-provider)
    is a service that consumes and produces SAML messages that can be used to communicate with GOV.UK Verify
 * [_Passport.js_](http://passportjs.org/) is a Node.js library that provides a generic authentication framework for various authentication providers.


## Contribute to `passport-verify`

If you want to make changes to `passport-verify` itself, fork the repository then:

__Install the dependencies__
```
npm install
```

__Compile and test the code__
```
npm test
```

__Install dependencies, compile and test the code - run this before commiting__
```
npm run pre-commit
```

## Responsible Disclosure

If you think you have discovered a security issue in this code please email disclosure@digital.cabinet-office.gov.uk with details.

For non-security related bugs and feature requests please [raise an issue](https://github.com/alphagov/passport-verify/issues/new) in the github issue tracker.
