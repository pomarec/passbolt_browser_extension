/**
 * Main configuration file.
 *
 * @copyright (c) 2015-present Bolt Softwares Pvt Ltd
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
// Config and user models
var Config = require('./model/config');
var User = require('./model/user').User;

// console and debug utilities
if (Config.isDebug() == true) {
  require('./controller/consoleController').setLogLevel('all');
}

/* ==================================================================================
 *  Interface changes
 *  Where we affect the look and feel of the firefox instance
 * ==================================================================================
 */
var ToolbarController = require('./controller/toolbarController').ToolbarController;
new ToolbarController();

/* ==================================================================================
 *  Page mods init
 *  Run scripts in the context of web pages whose URL matches a given pattern.
 *  see. https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/page-mod
 * ==================================================================================
 */
var pageMods = require('./app').pageMods;

pageMods.Bootstrap.init();

// If the user is valid we enable the login pagemod
var user = new User();
if (user.isValid()) {
  // Auth pagemod init can also be triggered
  // by debug, setup and user events (e.g. when config change)
  pageMods.PassboltAuth.init();

  // App pagemod init is generally triggered after a successful login
  // We only initialize it here for the cases where the user is already logged in
  user.isLoggedIn()
    .then(function() {
      pageMods.PassboltApp.init();
    });
}

// Setup pagemods
pageMods.SetupBootstrap.init();
pageMods.Setup.init();

// Other pagemods active all the time
// but triggered by App or Auth
pageMods.PassboltAuthForm.init();
pageMods.MasterPasswordDialog.init();
pageMods.ProgressDialog.init();
pageMods.SecretEditDialog.init();
pageMods.ShareDialog.init();
pageMods.ShareAutocompleteDialog.init();

// Debug pagemod
if (Config.isDebug()) {
  pageMods.Debug.init();
}
