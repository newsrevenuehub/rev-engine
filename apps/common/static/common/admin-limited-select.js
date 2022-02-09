/**
 * This module, loaded by apps/common/templatetags/revengine_tags.py#admin_limited_select, is
 * responsible for responding to changes in a django admin foreign key related field dropdown (parentField) by
 * updating a dependent model's (childField) related field dropdown.
 */
(function ($) {
  // Grab configuration JSON from script tag.
  var config = JSON.parse(
    document.getElementById("admin-limited-select-config").textContent
  );
  var parentSelected = false;
  var options = [];
  var parentFieldSelector = "select[name='" + config.parentSelector + "']";
  var childFieldSelector = "select[name*='" + config.childSelector + "']";
  var noChildrenText =
    "The " +
    config.parentModelName +
    " you've selected does not have any " +
    config.childModelName +
    "s defined";
  var noParentText =
    "Please select an " +
    config.parentModelName +
    " before selecting " +
    config.childModelName +
    "s";

  $(parentFieldSelector).on("change", function (e) {
    // Every time the parent model is changed, fetch options and set them to var
    setOptionsByParentChoice(e.target.value).then(() => {
      // Then reset the options for any selects that might already be visible.
      $(childFieldSelector).each(function (_, el) {
        setSelectOptions($(el));
      });
    });
  });

  $(document).on("formset:added", function (_, $row) {
    // This handler listens to Django's custom event, "formset:added", which occurs
    // when an inline formset is added to the page. Here, we take the row that was added and,
    // if it contains our expected selector, we set its options.
    var select = $row.find(childFieldSelector);
    setSelectOptions($(select));
  });

  function fetchOptions(ajaxConfig) {
    return $.get({
      url: config.adminSelectUrl,
      ...ajaxConfig,
    });
  }

  function setOptionsByParentChoice(parentId) {
    return new Promise(function (resolve, reject) {
      if (parentId) {
        var data = {
          parentId,
          parentModel: config.parentModel,
          accessorMethod: config.accessorMethod,
        };
        parentSelected = true;
        fetchOptions({ data, error: reject }).done(function ({ data }) {
          options = data;
          resolve(data);
        });
      } else {
        parentSelected = false;
        options = [];
        resolve([]);
      }
    });
  }

  function setSelectOptions($select) {
    $select.empty();

    if (options.length === 0) {
      var text = "";
      if (parentSelected) text = noChildrenText;
      else text = noParentText;
      $select.prop("disabled", true);
      $select.append($("<option></option>").attr("value", "").text(text));
    } else {
      $select.prop("disabled", false);
      // Add back the "empty" value
      $select.append($("<option></option>").attr("value", "").text("----"));
      // Then for each option, add an <option>
      $.each(options, function (_, option) {
        $select.append(
          $("<option></option>").attr("value", option[1]).text(option[0])
        );
      });
    }
  }
})(window.django.jQuery);
