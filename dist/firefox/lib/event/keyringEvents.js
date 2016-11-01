/**
 * Keyring events
 * @TODO refactor with public and private listeners separate
 *
 * @copyright (c) 2015-present Bolt Softwares Pvt Ltd
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
var __ = require("sdk/l10n").get;

var Keyring = require("../model/keyring").Keyring;
var Key = require('../model/key').Key;
var Config = require('../model/config');
var keyring = new Keyring();
var key = new Key();

var fileController = require('../controller/fileController');

var listen = function (worker) {

  /* ==================================================================================
   *  Get Key info events
   * ================================================================================== */

  /*
   * Get the public key information.
   *
   * @listens passbolt.keyring.public.info
   * @param requestId {int} The request identifier
   * @param publicKeyArmored {string} The public key
   */
  worker.port.on('passbolt.keyring.public.info', function (requestId, publicKeyArmored) {
    try {
      var info = keyring.keyInfo(publicKeyArmored);
    } catch (e) {
      worker.port.emit('passbolt.keyring.public.info.complete', requestId, 'ERROR', e.message);
    }

    if (typeof info !== 'undefined') {
      worker.port.emit('passbolt.keyring.public.info.complete', requestId, 'SUCCESS', info);
    } else {
      worker.port.emit('passbolt.keyring.public.info.complete', requestId, 'ERROR');
    }
  });

  /*
   * Get a user's public key.
   *
   * @listens passbolt.keyring.public.get
   * @param requestId {int} The request identifier
   * @param userId {string} The user to retrieve the public key
   */
  worker.port.on('passbolt.keyring.public.get', function (requestId, userId) {
    var publicKey = keyring.findPublic(userId);
    if (typeof publicKey !== 'undefined') {
      worker.port.emit('passbolt.keyring.public.get.complete', requestId, 'SUCCESS', publicKey);
    } else {
      worker.port.emit('passbolt.keyring.public.get.complete', requestId, 'ERROR');
    }
  });

  /*
   * Get the user private key.
   *
   * @listens passbolt.keyring.private.get
   * @param requestId {int} The request identifier
   */
  worker.port.on('passbolt.keyring.private.get', function (requestId) {
    var info = keyring.findPrivate();
    if (typeof info !== 'undefined') {
      worker.port.emit('passbolt.keyring.private.get.complete', requestId, 'SUCCESS', info);
    } else {
      worker.port.emit('passbolt.keyring.private.get.complete', requestId, 'ERROR');
    }
  });

  /*
   * Get the server's public key.
   *
   * @listens passbolt.keyring.server.get
   * @param requestId {int} The request identifier
   */
  worker.port.on('passbolt.keyring.server.get', function (requestId) {

    var user = new (require("../model/user").User)(),
      Crypto = require('../model/crypto').Crypto,
      serverkeyid = Crypto.uuid(user.settings.getDomain()),
      serverkey = keyring.findPublic(serverkeyid);

    if (typeof serverkey !== 'undefined') {
      worker.port.emit('passbolt.keyring.server.get.complete', requestId, 'SUCCESS', serverkey);
    } else {
      worker.port.emit('passbolt.keyring.server.get.complete', requestId, 'ERROR');
    }
  });

  /*
   * Extract the public key from a private armored key.
   *
   * @listens passbolt.keyring.public.extract
   * @param requestId {int} The request identifier
   * @param privateKeyArmored {string} The private armored key
   */
  worker.port.on('passbolt.keyring.public.extract', function (requestId, privateKeyArmored) {
    var publicKeyArmored = keyring.extractPublicKey(privateKeyArmored);
    if (typeof publicKeyArmored !== 'undefined') {
      worker.port.emit('passbolt.keyring.public.extract.complete', requestId, 'SUCCESS', publicKeyArmored);
    } else {
      worker.port.emit('passbolt.keyring.public.extract.complete', requestId, 'ERROR');
    }
  });

  /*
   * Validate the key information.
   *
   * @listens passbolt.keyring.key.validate
   * @param requestId {int} The request identifier
   * @param keyData {array} The key information
   * @param fields {array} The names of the variable to validate
   */
  worker.port.on('passbolt.keyring.key.validate', function (requestId, keyData, fields) {
    try {
      var validate = key.validate(keyData, fields);
      worker.port.emit('passbolt.keyring.key.validate.complete', requestId, 'SUCCESS', validate);
    } catch (e) {
      worker.port.emit('passbolt.keyring.key.validate.complete', requestId, 'ERROR', e.message, e.validationErrors);
    }
  });

  /* ==================================================================================
   *  Import Key & Sync' events
   * ================================================================================== */

  /*
   * Import the user private armored key.
   *
   * @listens passbolt.keyring.private.import
   * @param requestId {int} The request identifier
   * @param privateKeyArmored {string} The private armored key to import
   */
  worker.port.on('passbolt.keyring.private.import', function (requestId, privateKeyArmored) {
    try {
      keyring.importPrivate(privateKeyArmored);
      worker.port.emit('passbolt.keyring.private.import.complete', requestId, 'SUCCESS');
    } catch (e) {
      console.log(e);
      worker.port.emit('passbolt.keyring.private.import.complete', requestId, 'ERROR', privateKeyArmored)
    }
  });

  /*
   * Import a user's public armored key.
   *
   * @listens passbolt.keyring.public.import
   * @param requestId {int} The request identifier
   * @param publicKeyArmored {string} The public armored key to import
   * @param userId {string} The user identifier
   */
  worker.port.on('passbolt.keyring.public.import', function (requestId, publicKeyArmored, userid) {
    try {
      keyring.importPublic(privateKeyArmored, userid);
      worker.port.emit('passbolt.keyring.public.import.complete', requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit('passbolt.keyring.public.import.complete', requestId, 'ERROR', e.message)
    }
  });

  /*
   * Import the server public armored key.
   *
   * @listens passbolt.keyring.server.import
   * @param requestId {int} The request identifier
   * @param publicKeyArmored {string} The public armored key to import
   */
  worker.port.on('passbolt.keyring.server.import', function (requestId, publicKeyArmored) {
    try {
      var user = new (require("../model/user").User)();
      keyring.importServerPublicKey(publicKeyArmored, user.settings.getDomain());
      worker.port.emit('passbolt.keyring.server.import.complete', requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit('passbolt.keyring.server.import.complete', requestId, 'ERROR', e.message)
    }
  });

  /*
   * Synchronize the keyring with the server.
   *
   * @listens passbolt.keyring.sync
   * @param requestId {int} The request identifier
   */
  worker.port.on('passbolt.keyring.sync', function (requestId) {
    keyring.sync()
      .then(function (keysCount) {
        worker.port.emit('passbolt.keyring.sync.complete', requestId, 'SUCCESS', keysCount);
      });
  });

  /*
   * Check the private key passphrase.
   *
   * @listens passbolt.keyring.private.checkpassphrase
   * @param requestId {int} The request identifier
   * @param passphrase {string} The passphrase to check
   */
  worker.port.on('passbolt.keyring.private.checkpassphrase', function (requestId, passphrase) {
    keyring.checkPassphrase(passphrase).then(
      function () {
        worker.port.emit('passbolt.keyring.private.checkpassphrase.complete', requestId, 'SUCCESS');
      },
      function (error) {
        worker.port.emit('passbolt.keyring.private.checkpassphrase.complete', requestId, 'ERROR',
          __('This is not a valid passphrase'));
      }
    );
  });

  /* ==================================================================================
   *  Generate and backups key events
   * ================================================================================== */

  /*
   * Offer to the user to backup his key by downloading it.
   *
   * @listens passbolt.keyring.key.backup
   * @param requestId {int} The request identifier
   * @param key {string} The key to backup
   * @param filename {string} The filename to use for the downloadable file
   */
  worker.port.on('passbolt.keyring.key.backup', function (requestId, key, filename) {

    if (filename == undefined) {
      filename = 'passbolt.asc';
    }
    // If debug mode is enabled, add .txt at the end of filename.
    if (Config.isDebug() == true) {
      filename += '.txt';
    }

    fileController.saveFile(filename, key)
      .then(function () {
        worker.port.emit('passbolt.keyring.key.backup.complete', requestId, 'SUCCESS');
      }, function () {
        worker.port.emit('passbolt.keyring.key.backup.complete', requestId, 'ERROR');
      });
  });

  /*
   * Generate a private armored key.
   *
   * @listens passbolt.keyring.generateKeyPair
   * @param requestId {int} The request identifier
   * @param keyInfo {array} The key parameters
   * @param passphrase {string} The key passphrase
   */
  worker.port.on('passbolt.keyring.generateKeyPair', function (requestId, keyInfo, passphrase) {
    try {
      keyring.generateKeyPair(keyInfo, passphrase)
        .then(
          function (key) {
            worker.port.emit('passbolt.keyring.generateKeyPair.complete', requestId, 'SUCCESS', key);
          },
          function (errorMsg) {
            worker.port.emit('passbolt.keyring.generateKeyPair.complete', requestId, 'ERROR', errorMsg);
          });

    } catch (e) {
      worker.port.emit('passbolt.keyring.generateKeyPair.complete', requestId, 'ERROR', e.message);
    }
  });

};
exports.listen = listen;