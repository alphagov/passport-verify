## Passport Verify - Publishing the package to NPM

Any updates to the package, including incrementing the versions of dependencies as recommended by Greenkeeper
should be published to NPM using

```
npm publish
```

### Getting authorisation to publish:

In order to publish this package, the developer needs to create an account with npm either through the [npm website](https://www.npmjs.com) or using the command line:

```
npm adduser
```

This account should then be added to the @verify organisation by an org owner.
This will automatically add that user to the 'developers' team and give that account read and write access
to the passport-verify package.

### Removing publishing privileges

If a member of this developers team leaves, they should be removed from the @verify organisation's membership list.

This can be done by an org owner through the npm portal

A list of members can be seen using:

```
npm team ls verify:developers
```
