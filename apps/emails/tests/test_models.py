import pytest

from apps.emails.models import EmailCustomization
from apps.organizations.models import RevenueProgram


@pytest.mark.django_db
class TestEmailCustomization:

    @pytest.fixture
    def customization(self, revenue_program: RevenueProgram) -> EmailCustomization:
        """Fixture to create a default EmailCustomization instance."""
        return EmailCustomization.objects.create(
            content_html="<p>Test content</p>",
            email_type="test_email",
            email_block="test_block",
            revenue_program=revenue_program,
        )

    def test_save_removes_unexpected_html_tags(self, customization: EmailCustomization):
        customization.content_html = "<script>not allowed</script><b>OK</b>"
        customization.save()
        assert customization.content_html == "<b>OK</b>"

    def test_save_removes_unexpected_html_attributes(self, customization: EmailCustomization):
        customization.content_html = '<b onclick="doEvil()">should be pruned</b>'
        customization.save()
        assert customization.content_html == "<b>should be pruned</b>"

    def test_plain_text_conversion(self, customization: EmailCustomization):
        customization.content_html = """
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
        assert customization.content_plain_text == "\n".join(  # noqa: FLY002 need exact line breaks w/o indentation
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
