// https://civicrm.org/licensing
/**
 * By default this simply loads tabs via ajax CRM.loadPage method
 * Tabs with class 'ajaxForm' will use CRM.loadForm instead, suitable for most forms
 * Tabs with class 'livePage' will get popup action links, suitable for crud tables
 */
cj(function($) {
  var tabSettings = CRM.tabSettings || {};
  tabSettings.active = tabSettings.active ? $('#tab_' + tabSettings.active).prevAll().length : 0;
  $("#mainTabContainer")
    .on('tabsbeforeactivate', function(e, ui) {
      // Warn of unsaved changes - requires formNavigate.tpl to be included in each tab
      if (!global_formNavigate) {
        CRM.alert(ts('Your changes in the <em>%1</em> tab have not been saved.', {1: ui.oldTab.text()}), ts('Unsaved Changes'), 'warning');
        global_formNavigate = true;
      }
    })
    .on('tabsbeforeload', function(e, ui) {
      // Use civicrm ajax wrappers rather than the default $.load
      if (!ui.panel.data("civiCrmSnippet")) {
        var method = ui.tab.hasClass('ajaxForm') ? 'loadForm' : 'loadPage';
        var params = {target: ui.panel};
        if (method === 'loadForm') {
          params.autoClose = params.openInline = params.cancelButton = params.refreshAction = false;
          ui.panel.on('crmFormLoad', function() {
            // Hack: "Save and done" and "Cancel" buttons submit without ajax
            $('.cancel.form-submit, input[name$=upload_done]', this).on('click', function(e) {
              $(this).closest('form').ajaxFormUnbind();
            })
          });
        }
        if (ui.tab.hasClass('livePage')) {
          ui.panel
            .off('click.crmLivePage')
            .on('click.crmLivePage', 'a.button, a.action-item', function() {
              var url = $(this).attr('href');
              // only follow real links not javascript buttons
              if (url === '#' || $(this).attr('onclick') || $(this).hasClass('no-popup')) {
                return;
              }
              CRM.loadForm(url, {
                openInline: 'a:not("[href=#], .no-popup")'
              }).on('crmFormSuccess', function(e, data) {
                  // Refresh when form completes
                  ui.panel.crmSnippet('refresh');
                });
              return false;
            });
        }
        ui.panel
          .off('.tabInfo')
          .on('crmLoad.tabInfo crmFormSuccess.tabInfo', function(e, data) {
            if (data) {
              if (typeof(data.tabCount) !== 'undefined') {
                CRM.tabHeader.updateCount(ui.tab, data.tabCount);
              }
              if ($.isPlainObject(data.updateTabs)) {
                $.each(data.updateTabs, CRM.tabHeader.updateCount);
                $.each(data.updateTabs, CRM.tabHeader.resetTab);
              }
              if (typeof(data.tabValid) !== 'undefined') {
                var method = data.tabValid ? 'removeClass' : 'addClass';
                ui.tab[method]('disabled');
              }
            }
          });
        CRM[method]($('a', ui.tab).attr('href'), params);
      }
      e.preventDefault();
    })
    .tabs(tabSettings);
});
(function($) {
  // Utility functions
  CRM.tabHeader = CRM.tabHeader || {};

  /**
   * @param tab jQuery selector
   * @returns panel jQuery object
   */
  CRM.tabHeader.getTabPanel = function(tab) {
    return $('#' + $(tab).attr('aria-controls'));
  };

  /**
   * Update the counter in a tab
   * @param tab jQuery selector
   * @param count number
   */
  CRM.tabHeader.updateCount = function(tab, count) {
    var oldClass = $(tab).attr('class').match(/(crm-count-\d+)/);
    if (oldClass) {
      $(tab).removeClass(oldClass[0]);
    }
    $(tab)
      .addClass('crm-count-' + count)
      .find('a em').html('' + count);
  };

  /**
   * Clears tab content so that it will be refreshed next time the user clicks on it
   * @param tab
   */
  CRM.tabHeader.resetTab = function(tab) {
    var $panel = CRM.tabHeader.getTabPanel(tab);
    if ($(tab).hasClass('ui-tabs-active')) {
      $panel.crmSnippet('refresh');
    } else {
      $panel.data("civiCrmSnippet") && $panel.crmSnippet('destroy');
    }
  };
})(cj);