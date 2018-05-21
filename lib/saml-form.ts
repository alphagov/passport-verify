/**
 * @hidden
 */
/** */
import * as escape from 'escape-html'

export function createSamlForm (ssoLocation: string, samlRequest: string) {
  return `
    <form class='passport-verify-saml-form' method='post' action='${escape(ssoLocation)}'>
      <h1>Continue to next step</h1>
      <p>Because Javascript is not enabled on your browser, you must press the continue button</p>
      <input type='hidden' name='SAMLRequest' value='${escape(samlRequest)}'/>
      <input type='hidden' name='relayState' value=''/>
      <button class='passport-verify-button'>Continue</button>
    </form>
    <script>
      var form = document.forms[0]
      form.style.display = 'none'
      window.setTimeout(function () { form.style.display = 'block' }, 5000)
      form.submit()
    </script>
    <style type='text/css'>
      body {
        padding-top: 2em;
        padding-left: 2em;
      }
      .passport-verify-saml-form {
        font-family: Arial, sans-serif;
      }
      .passport-verify-button {
        background-color: #00823b;
        color: #fff;
        padding: 10px;
        font-size: 1em;
        line-height: 1.25;
        border: none;
        box-shadow: 0 2px 0 #003618;
        cursor: pointer;
      }
      .passport-verify-button:hover, .passport-verify-button:focus {
        background-color: #00692f;
      }
    </style>
  `
}
