/**
 * Main App.
 *
 * @copyright (c) 2015-present Bolt Softwares Pvt Ltd
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */

/* ==================================================================================
 *  Common page helpers
 * ================================================================================== */

// Notify the passbolt page that a process is currently running on the plugin.
// When the process is completed, the event
// passbolt.passbolt-page.loading should be fired.
passbolt.message.on('passbolt.passbolt-page.loading', function () {
  passbolt.message.emitToPage('passbolt_loading');
});

// Notify the passbolt page that a process has been completed on the plugin.
passbolt.message.on('passbolt.passbolt-page.loading_complete', function () {
  passbolt.message.emitToPage('passbolt_loading_complete');
});

// Add a css class to an html element
passbolt.message.on('passbolt.passbolt-page.add-class', function (selector, cssClass) {
  $(selector).addClass(cssClass);
});

// Remove a css class to an html element
passbolt.message.on('passbolt.passbolt-page.remove-class', function (selector, cssClass) {
  $(selector).removeClass(cssClass);
});

// Ask the passbolt page to release its focus
passbolt.message.on('passbolt.passbolt-page.remove-all-focuses', function () {
  passbolt.message.emitToPage('remove_all_focuses');
});

// Ask the passbolt page to resize an iframe
passbolt.message.on('passbolt.passbolt-page.resize-iframe', function (selector, dimension) {
  if (typeof dimension.height != 'undefined') {
    $(selector).css('height', dimension.height);
  }
  if (typeof dimension.width != 'undefined') {
    $(selector).css('width', dimension.width);
  }
});

// The passbolt application has been resized, when it happens the application
// emit a message to the plugin to notify it.
// @todo the plugin should check when the window is resized by itself.
window.addEventListener('passbolt.html_helper.window_resized', function (event) {
  var cssClasses = $('body').attr('class').split(' ');
  passbolt.message.emit('passbolt.app.window-resized', cssClasses);
});

/* ==================================================================================
 *  Share & share autocomplete
 * ================================================================================== */

// A permission has been added through the share iframe.
passbolt.message.on('passbolt.share.add-permission', function (permission) {
  passbolt.message.emitToPage('resource_share_add_permission', permission);
});

// A permission is deleted, the user shouldn't be listed anymore by the autocomplete
// result list component.
window.addEventListener('passbolt.share.remove_permission', function (event) {
  var data = event.detail,
  // The user the permission has been deleted for.
    userId = data.userId;

  // Notify the share dialog about this change
  passbolt.message.emit('passbolt.share.remove-permission', userId);
});

// When the user wants to share a password with other people.
// secret for the users the resource is shared with.
// Dispatch this event to the share iframe which will take care of the encryption.
window.addEventListener('passbolt.share.encrypt', function () {
  // Request the share dialog to encrypt the secret for the new users.
  passbolt.request('passbolt.share.encrypt').then(function (armoreds) {
    // Notify the App with the encrypted secret.
    passbolt.message.emitToPage('resource_share_encrypted', armoreds);
  }, function () {
    // Notify the App that the share encryption process has been canceled.
    passbolt.message.emitToPage('passbolt.plugin.share.canceled');
  });
});

/* ==================================================================================
 *  Secret edit
 * ================================================================================== */

// The secret has been updated, notify the application.
passbolt.message.on('passbolt.secret-edit.secret-updated', function () {
  passbolt.message.emitToPage('secret_edition_secret_changed');
});

// The secret has the focus and the tab key is pressed, notify the application.
passbolt.message.on('passbolt.secret-edit.tab-pressed', function () {
  passbolt.message.emitToPage('secret_tab_pressed');
});

// The secret has the focus and the back tab key is pressed, notify the application.
passbolt.message.on('passbolt.secret-edit.back-tab-pressed', function () {
  passbolt.message.emitToPage('secret_backtab_pressed');
});

// The application asks the plugin secret-edit iframe to get the focus.
window.addEventListener('passbolt.secret.focus', function () {
  passbolt.message.emit('passbolt.secret-edit.focus');
});

// When the user wants to save the changes on his resource, the application
// asks the plugin to encrypt the secret for all the users the resource
// is shared with.
window.addEventListener('passbolt.secret_edition.encrypt', function (event) {
  var usersIds = event.detail;
  passbolt.request('passbolt.secret-edit.encrypt', usersIds)
    .then(function (armoreds) {
      passbolt.message.emitToPage('secret_edition_secret_encrypted', armoreds);
    });
});

// The validation can have been ordered by another worker.
// Such as the secret that request a validation.
// In this case the application should display the right feedback to the user.
passbolt.message.on('passbolt.secret-edit.validate-success', function () {
  $('.js_form_element_wrapper.js_form_secret_wrapper').removeClass('error');
});
passbolt.message.on('passbolt.secret-edit.validate-error', function () {
  $('.js_form_element_wrapper.js_form_secret_wrapper').addClass('error');
});

// Before encrypting the edited secret, ensure the secret is valid.
window.addEventListener('passbolt.secret_edition.validate', function (event) {
  passbolt.request('passbolt.secret-edit.validate')
    .then(function () {
      passbolt.message.emitToPage('secret_edition_secret_validated', [true]);
    }, function () {
      passbolt.message.emitToPage('secret_edition_secret_validated', [false]);
    });
});

/* ==================================================================================
 * Application
 * ================================================================================== */

// The application asks the plugin to decrypt an armored string and store it
// in the clipboard.
window.addEventListener('passbolt.secret.decrypt', function (event) {
  var armoredSecret = event.detail;

  passbolt.message.emitToPage('passbolt_loading');

  // Decrypt the armored secret.
  passbolt.request('passbolt.app.decrypt-copy', armoredSecret)
    .then(function () {
      passbolt.message.emitToPage('passbolt_notify', {
        status: 'success',
        title: 'plugin_secret_copy_success'
      });
      passbolt.message.emitToPage('passbolt_loading_complete');
    }, function () {
      passbolt.message.emitToPage('passbolt_loading_complete');
    });
});

// The application asks the plugin to store a string into the clipboard.
window.addEventListener('passbolt.clipboard', function (event) {
  var toCopy = event.detail.data;
  passbolt.clipboard.copy(toCopy);

  // Notify the user.
  passbolt.message.emitToPage('passbolt_notify', {
    status: 'success',
    title: 'plugin_clipboard_copy_success',
    data: event.detail
  });
});

// Listen when the user requests a backup of his private key.
window.addEventListener("passbolt.settings.download_private_key", function () {
  passbolt.request('passbolt.keyring.private.get').then(function (key) {
    passbolt.request('passbolt.keyring.key.backup', key.key, 'passbolt_private.asc').then(function () {
      // The key has been saved.
    });
  });
});

// Listen when the user requests a backup of his public key.
window.addEventListener("passbolt.settings.download_public_key", function () {
  passbolt.request('passbolt.keyring.private.get').then(function (key) {
    passbolt.request('passbolt.keyring.public.extract', key.key).then(function (publicKeyArmored) {
      passbolt.request('passbolt.keyring.key.backup', publicKeyArmored, 'passbolt_public.asc').then(function () {
        // The key has been saved.
      });
    })
  });
});
