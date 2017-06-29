export function createSamlForm (location: string, samlRequest: string) {
  return `
    <form method='post' action='${location}'>
      <h1>Send SAML Authn request to hub</h1>
      <input type='hidden' name='SAMLRequest' value='${samlRequest}'/>
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
