import pytest

from apps.emails.models import EmailCustomization


@pytest.mark.django_db
class TestEmailCustomization:

    def test_save_removes_unexpected_html_tags(self, email_customization: EmailCustomization):
        email_customization.content_html = "<script>not allowed</script><b>OK</b>"
        email_customization.save()
        assert email_customization.content_html == "<b>OK</b>"

    def test_save_removes_unexpected_html_attributes(self, email_customization: EmailCustomization):
        email_customization.content_html = '<b onclick="doEvil()">should be pruned</b>'
        email_customization.save()
        assert email_customization.content_html == "<b>should be pruned</b>"

    def test_plain_text_conversion(self, email_customization: EmailCustomization):
        email_customization.content_html = """
          <p><b>Bold</b> <i>Italic</i> <s>Strike</s> <u>Underline</u></p>
          <ol>
            <li>One</li>
            <li>Two</li>
          </ol>
          <ul>
            <li>One</li>
            <li>Two</li>
          </ul>
          <p>Second paragraph</p>
        """
        assert (
            email_customization.content_plain_text
            == "\n".join(  # noqa: FLY002 need exact line breaks w/o indentation
                (
                    "**Bold** *Italic* ~~Strike~~ Underline",
                    "",
                    "1. One",
                    "2. Two",
                    "",
                    "* One",
                    "* Two",
                    "",
                    "Second paragraph",
                )
            )
        )
