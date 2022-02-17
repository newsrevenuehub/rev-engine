/**
 * This javascript is responsible for making the RoleAssignment change/add form behave
 * in a way that prevents impossible states from occurring.
 * It responds to changes in Role Type and adjusts which other fields are visible accordingly.
 * It responds to changes in Organization by updating the RevenuePrograms available (if RP Admin is
 * the selected Role Type)
 */
(function ($) {
  var oldRpVal;
  var $rpSelect = $("select[name='revenue_programs']");
  var prevSelected = [];

  setVisibleFieldsFromRoleValue();

  $("select[name='role_type']").on("change", setVisibleFieldsFromRoleValue);

  function setVisibleFieldsFromRoleValue(e) {
    var role;
    if (e) role = e.target.value;
    else role = $("select[name='role_type']").val();

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

  /**
   * Whenever the Organization is changed, reset the state of the revenue_programs
   * multi-select widget
   */
  $("select[name='organization']").on("change", function (e) {
    setPreviouslySelected();
    if (!oldRpVal || oldRpVal !== e.target.value) clearRpOptions();
    if (e.target.value) {
      fetchRevenuePrograms(e.target.value).then(setRevenuePrograms);
    }
  });

  function fetchRevenuePrograms(orgId) {
    return $.get({
      url: "/admin-select/",
      data: {
        parentId: orgId,
        parentModel: "organizations.Organization",
        accessorMethod: "admin_revenueprogram_options",
      },
    });
  }

  /**
   * Takes the response from the ajax call for revenuePrograms and populates the multi-select widget
   * accordingly. Using the state of the select options just before they're cleared, we can gather information
   * about which options were selected to begin with.
   */
  function setRevenuePrograms(response) {
    clearRpOptions();

    var revenueProgramOpts = response.data || [];
    $.each(revenueProgramOpts, function (_, option) {
      var opt = $("<option></option>")
        .attr("value", option[1])
        .attr("title", option[0])
        .text(option[0]);
      if (prevSelected.indexOf(option[1].toString()) !== -1) {
        opt.attr("selected", true);
      }
      $rpSelect.append(opt);
    });
  }

  function clearRpOptions() {
    $rpSelect.empty();
  }

  /**
   * Reads the "selected" attribute of revenue_program options to determine what
   * RPs, if any, are already set.
   */
  function setPreviouslySelected() {
    var prev = $rpSelect.children("option[selected]").toArray();
    prevSelected = prev.map(function (o) {
      return o.value;
    });
  }
})(window.django.jQuery);
