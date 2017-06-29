passport-verify
===============

Usage
-----

passport-verify uses `yarn` to manage dependencies. See https://yarnpkg.com/en/

In passport-verify:

```
# Install the dependencies
yarn install
# Compile and test the code
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

Notes
-----

* You need to have some body parser middleware installed
