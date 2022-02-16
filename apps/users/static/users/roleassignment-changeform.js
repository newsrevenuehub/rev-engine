(function ($) {
  setVisibleFieldsFromRoleValue();

  $("select[name='role_type']").on("change", setVisibleFieldsFromRoleValue);

  function setVisibleFieldsFromRoleValue(roleSelected) {
    var role = roleSelected;
    if (!role) role = $("select[name='role_type']").val();

    if (role === "hub_admin") {
      hideOrg();
      hideRPs();
    }

    if (role === "org_admin") {
      showOrg();
      hideRPs();
    }

    if (role === "rp_admin") {
      showOrg();
      showRPs();
    }

    if (!role) {
      hideOrg();
      hideRPs();
    }
  }

  function hideOrg() {
    $("div.form-row.field-organization").hide();
  }
  function showOrg() {
    $("div.form-row.field-organization").show();
  }

  function hideRPs() {
    $("div.form-row.field-revenue_programs").hide();
  }
  function showRPs() {
    $("div.form-row.field-revenue_programs").show();
  }
})(window.django.jQuery);
