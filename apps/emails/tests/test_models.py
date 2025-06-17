import pytest

from apps.emails.models import EmailCustomization


@pytest.mark.django_db
class TestEmailCustomization:

    def test_save_removes_unexpected_html_tags(self, email_customization: EmailCustomization):
        email_customization.content_html = "<script>not allowed</script><strong>OK</strong>"
        email_customization.save()
        assert email_customization.content_html == "<strong>OK</strong>"

    def test_save_removes_unexpected_html_attributes(self, email_customization: EmailCustomization):
        email_customization.content_html = '<strong onclick="doEvil()">should be pruned</strong>'
        email_customization.save()
        assert email_customization.content_html == "<strong>should be pruned</strong>"

    def test_plain_text_conversion(self, email_customization: EmailCustomization):
        email_customization.content_html = """
          <p><strong>Bold</strong> <em>Italic</em> <s>Strike</s> <u>Underline</u></p>
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
