/**
 * @hidden
 */
/** */
import * as escape from 'escape-html'

export function createSamlForm (ssoLocation: string, samlRequest: string) {
  return `
    <form method='post' action='${escape(ssoLocation)}'>
      <h1>Send SAML Authn request to hub</h1>
      <input type='hidden' name='SAMLRequest' value='${escape(samlRequest)}'/>
      <input type='hidden' name='relayState' value=''/>
      <button>Submit</button>
    </form>
    <script>
      var form = document.forms[0]
      form.setAttribute('style', 'display: none;')
      window.setTimeout(function () { form.removeAttribute('style') }, 5000)
      form.submit()
    </script>
  `
}
