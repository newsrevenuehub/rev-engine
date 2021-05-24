export function thankYouRedirect(page, history) {
  if (page.thank_you_redirect) {
    window.location = page.thank_you_redirect;
  } else {
    history.push();
  }
}
