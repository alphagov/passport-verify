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
      form.setAttribute('style', 'display: none;')
      window.setTimeout(function () { form.removeAttribute('style') }, 5000)
      form.submit()
    </script>
  `
}
