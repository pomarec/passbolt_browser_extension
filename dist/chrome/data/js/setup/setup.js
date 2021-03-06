/**
 * Setup
 *
 * @copyright (c) 2015-present Bolt Softwares Pvt Ltd
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */

var passbolt = passbolt || {};
passbolt.setup = passbolt.setup || {};
passbolt.setup.data = passbolt.setup.data || {};

(function ($) {
  // The current step id the user is working on.
  var currentStepId = null,
  // Default actions available at each step.
    defaultStepActions = {
      submit: 'enabled',
      cancel: 'enabled'
    },
  // Actions and their default states.
    actionsStates = {
      submit: 'enabled',
      cancel: 'enabled'
    },
  // Actions wrapper element.
    $actionsWrapper = $('#js_step_actions'),
  // Menu wrapper element.
    $menuWrapper = $('#js_menu'),
  // Content wrapper element.
    $contentWrapper = $('#js_step_content'),
  // Title element.
    $title = $('#js_step_title');


  /* ==================================================================================
   *  Add on code events
   * ================================================================================== */

  /**
   * Listens to passbolt.setup.init event
   * This event is launched when the pagemod is loaded.
   */
  passbolt.message.on('passbolt.setup.init', function (data) {
    passbolt.setup.init(data);
  });

  /* ==================================================================================
   *  Content code events
   * ================================================================================== */

  /**
   * Called when a click on button next is done.
   *
   * Takes care of informing the controller that the step is changing,
   * so the proper setup information will be stored in the setup model.
   *
   * @param stepId {string} The name of the step
   * @returns {promise}
   */
  passbolt.setup.onNavigationGoTo = function (stepId) {
    // Don't do anything if the step is not supposed to be part of the history.
    // Example : generation in progress.
    if (passbolt.setup.steps[stepId]['saveInHistory'] == undefined
      || passbolt.setup.steps[stepId]['saveInHistory'] == false) {

      return passbolt.request('passbolt.setup.navigation.next', stepId)
        .then(function (stepId) {
          return stepId;
        });
    }
  };

  /**
   * Called when a click on button previous is done.
   *
   * Takes care of informing the controller that the step is changing,
   * so the proper setup information will be stored in the setup model.
   *
   * @param stepId {string} The name of the step
   * @returns {promise}
   */
  passbolt.setup.onNavigationBack = function () {
    return passbolt.request('passbolt.setup.navigation.back')
      .then(function (lastStep) {
        return lastStep;
      });
  };

  /* ==================================================================================
   *  Getters and setters
   * ================================================================================== */

  /**
   * Get Setup data from controller.
   * @returns {promise}
   */
  passbolt.setup.get = function (key) {
    return passbolt.request('passbolt.setup.get', key)
      .then(function (setupData) {
        return setupData;
      });
  };

  /**
   * Set Setup data in controller.
   * @returns {promise}
   */
  passbolt.setup.set = function (key, value) {
    return passbolt.request('passbolt.setup.set', key, value)
      .then(function (setupData) {
        return setupData;
      });
  };

  /**
   * Ask controller about navigation history.
   * @returns {promise}
   */
  passbolt.setup.getNavigationHistory = function () {
    return passbolt.request('passbolt.setup.navigation.get.history')
      .then(function (history) {
        return history;
      });
  };

  /**
   * Get the potential next steps of a step.
   *
   * @param stepId {string} The step name
   * @param arr {array} The next steps already found
   * @returns {array}
   */
  passbolt.setup.getNextSteps = function (targetStepId, arr) {
    var arr = arr || [],
      potentialChildren = [],
      favoriteChild = null;

    // Look for future.
    for (var stepId in passbolt.setup.steps) {
      if (passbolt.setup.steps[stepId].parents) {
        if (passbolt.setup.steps[stepId].parents.indexOf(targetStepId) != -1) {
          potentialChildren.push(stepId);
        }
      }
    }

    // Look for the default way.
    if (potentialChildren.length) {
      // Look for the favorite child, by default it's always the last one :D
      for (var i = 0; i < potentialChildren.length; i++) {
        favoriteChild = potentialChildren[i];
        if (passbolt.setup.steps[potentialChildren[i]].favorite) {
          break;
        }
      }
      arr.push(favoriteChild);
      passbolt.setup.getNextSteps(favoriteChild, arr);
    }

    return arr;
  };

  /**
   * Get the workflow.
   * Workflow is an array of steps.
   * @returns {promise}
   */
  passbolt.setup.getWorkflow = function () {
    return passbolt.setup.getNavigationHistory()
      .then(function (history) {
        var workflow = history;
        workflow.push(currentStepId);
        workflow = workflow.concat(passbolt.setup.getNextSteps(currentStepId));
        return workflow;
      });

  };

  /**
   * Get the menu items.
   * @returns {promise}
   */
  passbolt.setup.getMenuSteps = function (targetStepId) {
    if (targetStepId == undefined) {
      targetStepId = currentStepId;
    }

    // Get the current workflow.
    return passbolt.setup.getWorkflow(targetStepId)
      .then(function (workflow) {
        var menuSteps = [],
          state = null;


        for (var i in workflow) {
          var stepId = workflow[i],
            step = passbolt.setup.steps[stepId];

          // If the task is a subStep, so it is not visible, and its parent become current
          if (step.subStep) {
            if (step.id == targetStepId) {
              menuSteps[menuSteps.length - 1].state = 'current';
            }
            continue;
          }

          // If the step is the current step.
          if (step.id == targetStepId) {
            state = 'current';
          }
          // If the latest state was current or future, this step is in the future.
          else if (menuSteps.length && (menuSteps[menuSteps.length - 1].state == 'current'
            || menuSteps[menuSteps.length - 1].state == 'future')) {
            state = 'future';
          }
          // The step is a past step
          else {
            state = 'past';
          }

          menuSteps.push({
            'stepId': stepId,
            'state': state
          });
        }

        return menuSteps;
      });
  };

  /* ==================================================================================
   *  Business logic
   * ================================================================================== */

  /**
   * Set an action state.
   * @param action {string} The action name
   * @param state {string} The state name
   */
  passbolt.setup.setActionState = function (action, state) {
    // Go out of the previous state.
    var $action = $('#js_setup_' + action + '_step');
    // Remove the previous state class.
    $action.removeClass(function (index, css) {
      return (css.match(/(^|\s)js-state-\S+/g) || []).join(' ');
    });
    $action.removeClass('disabled hidden enabled processing');

    // Go in the new state.
    actionsStates[action] = state;
    // Add the new state class.
    $action.addClass('js-state-' + state).addClass(state);
  };

  /**
   * Init action buttons for the step according to what is defined
   * in the step data.
   *
   * @param stepId {string} The step name
   * @returns {promise}
   */
  passbolt.setup.initActionButtons = function (stepId) {
    var step = passbolt.setup.steps[stepId];

    // Empty actions container.
    $actionsWrapper.empty();

    // Load the actions template
    return passbolt.helper.html.loadTemplate($actionsWrapper, './tpl/setup/action_buttons.ejs')
      .then(function () {
        // Define which actions are available, as well as their states.
        // This is based on defaultActions, and extended with step actions if defined.
        var actions = defaultStepActions;
        if (step.defaultActions != undefined) {
          actions = $.extend({}, defaultStepActions, step.defaultActions);
        }

        // Set appropriate state for each action, as per final settings.
        for (var action in actions) {
          var state = actions[action];
          passbolt.setup.setActionState(action, state);
        }

        // Define action elements in dom.
        var $nextButton = $('#js_setup_submit_step'),
          $cancelButton = $('#js_setup_cancel_step');

        // Bind click on the go to next step button.
        $nextButton.click(function (ev) {
          ev.preventDefault();
          if (actionsStates['submit'] != 'enabled') {
            return;
          }

          step.submit().then(function () {
            passbolt.setup.goForward(step.next);
          });
        });

        // Bind click on the cancel step button.
        $cancelButton.click(function (ev) {
          ev.preventDefault();
          if (actionsStates['cancel'] != 'enabled') {
            return;
          }

          var previousStepId = null;
          step.cancel().then(function () {
            passbolt.setup.goBackward();
          });
        });
      });
  };

  /**
   * Init and render menu according to the step provided.
   * @param stepId {string} The step name
   * @returns {promise}
   */
  passbolt.setup.initMenu = function (stepId) {
    return passbolt.setup.getMenuSteps()
      .then(function (menuSteps) {
        var data = {
          steps: passbolt.setup.steps,
          menuSteps: menuSteps,
          currentStepId: stepId
        };

        return passbolt.helper.html.loadTemplate($menuWrapper, './tpl/setup/menu.ejs', 'html', data);
      });
  };

  /**
   * Init and render step content according to the step provided in argument.
   * Also set the title.
   * @param stepId {string} The step name
   * @returns {promise}
   */
  passbolt.setup.initContent = function (stepId) {
    var step = passbolt.setup.steps[stepId];

    // Empty content container.
    $contentWrapper.empty();

    // Set the page title.
    $title.html(step.title);

    // Initialize the step.
    return step.init()

      .then(function () {
        // Load the template relative to the step and start the step.
        var tplPath = './tpl/setup/' + currentStepId + '.ejs';
        return passbolt.helper.html.loadTemplate($contentWrapper, tplPath, 'html', step.viewData)
          .then(function () {
            // Get elements for all selectors.
            if (step.elts != undefined) {
              for (name in step.elts) {
                step.elts['$' + name] = $(step.elts[name]);
              }
            }

            // Start the step.
            step.start();
          });
      });
  };

  /**
   * Go to the step.
   * @param targetStepId {string} The step name
   * @returns {promise}
   */
  passbolt.setup.goToStep = function (targetStepId) {

    // Initialize and render menu.
    return passbolt.setup.initMenu(targetStepId)

      // Init step action buttons.
      .then(function () {
        return passbolt.setup.initActionButtons(targetStepId);
      })

      // Init content.
      // Is done at the end because this step will take care of initializing the button states too.
      .then(function () {
        return passbolt.setup.initContent(targetStepId);
      });
  };

  /**
   * Switch to step.
   * @param targetStepId {string} The step name
   */
  passbolt.setup.switchToStep = function (targetStepId) {
    currentStepId = targetStepId;
    passbolt.setup.goToStep(currentStepId);
  };

  /**
   * Go forward.
   * @param targetStepId {string} The step name
   */
  passbolt.setup.goForward = function (targetStepId) {
    currentStepId = targetStepId;

    // Event onNavigationGoTo.
    // Will store for us the current step id, and build the history.
    passbolt.setup.onNavigationGoTo(targetStepId);

    passbolt.setup.goToStep(currentStepId);
  };

  /**
   * Go backward.
   * @param targetStepId {string} The step name
   */
  passbolt.setup.goBackward = function (targetStepId) {
    passbolt.setup.onNavigationBack()
      .then(function (lastStepId) {
        if (lastStepId != '') {
          currentStepId = lastStepId;
          passbolt.setup.goToStep(lastStepId);
        }
      });
  };

  /* ==================================================================================
   *  Init functions
   * ================================================================================== */

  /**
   * Check the setup information are valid.
   * @param setupData {array} The setup information
   * @returns {boolean}
   * @private
   */
  passbolt.setup._initCheckData = function (setupData) {
    var isCorrect =
      setupData != undefined && setupData.settings != undefined && setupData.user != undefined
      && setupData.settings.domain != undefined && setupData.settings.domain != ''
      && setupData.settings.token != undefined && setupData.settings.token != ''
      && setupData.user.username != undefined && setupData.user.username != ''
      && setupData.user.id != undefined && setupData.user.id != ''
      && setupData.user.firstname != undefined && setupData.user.firstname != ''
      && setupData.user.lastname != undefined && setupData.user.lastname != '';

    return isCorrect;
  };

  /**
   * Prepare data to initialize setup.
   * Try to retrieve setup data from storage in case of a previous unfinished setup,
   * or get them from the parameters that are provided.
   *
   * @param data {array} raw setup data (includes domain, token, firstName, lastName, username)
   * @returns {promise}
   * @private
   */
  passbolt.setup._initPrepareData = function (data) {

    var def = $.Deferred();

    // Are data provided by page ?
    var dataIsProvided = passbolt.setup._initCheckData(data);

    var defaultSetupData = {};

    if (dataIsProvided) {
      defaultSetupData = data;
    }

    // Check if setup was already started from the storage.
    passbolt.request('passbolt.setup.get')
      .then(function (storageData) {
        if (passbolt.setup._initCheckData(storageData)) {
          // If we are in the case where the data provided don't match
          // the setup data we already have in storage,
          // we flush the storage.
          if (dataIsProvided && storageData.settings.token != defaultSetupData.settings.token) {
            passbolt.request('passbolt.setup.flush')
              .then(function () {
                def.resolve(defaultSetupData);
              });
          }
          else {
            def.resolve(storageData);
          }
        }
        // If data is passed and is populated, then build setup data from there.
        else if (dataIsProvided) {
          def.resolve(defaultSetupData);
        }
        else {
          def.reject('Unable to retrieve setup data');
        }
      })
      .then(null, function () {
        if (dataIsProvided) {
          def.resolve(defaultSetupData);
        }
        else {
          def.reject('Unable to retrieve setup data');
        }
      });

    return def;
  };

  /**
   * Validate setup data regarding the user.
   * Initialization function to be used at the beginning of the setup.
   *
   * @param data {array} The user information
   * @returns {promise}
   * @private
   */
  passbolt.setup._initValidateUser = function (data) {
    return passbolt.request('passbolt.user.validate', data.user, ['id', 'username', 'firstname', 'lastname'])
      .then(function (user) {
        return data;
      });
  };


  /**
   * Set user in the setup storage.
   * To be used after validation of the user data.
   *
   * @param data {array} The user information
   * @returns {promise}
   * @private
   */
  passbolt.setup._initSetUser = function (data) {
    return passbolt.request('passbolt.setup.set', 'user', data.user)
      .then(function (setup) {
        return data;
      });
  };

  /**
   * Validate setup data regarding the settings.
   *
   * @param data
   * @returns {*}
   * @private
   */
  passbolt.setup._initValidateSettings = function (data) {
    return passbolt.request('passbolt.user.settings.validate', data.settings, ['domain'])
      .then(function (settings) {
        return data;
      });
  };

  /**
   * Set settings in the setup storage.
   *
   * @param data {array} The setup information
   * @returns {promise}
   * @private
   */
  passbolt.setup._initSetSettings = function (data) {
    return passbolt.request('passbolt.setup.set', 'settings', data.settings)
      .then(function (setupData) {
        return data;
      });
  };

  /**
   * Retrieve step id from previous setup if any, and if not
   * returns the default one.
   *
   * @returns {promise}
   * @private
   */
  passbolt.setup._initGetStepId = function () {
    // Get value from setup.
    return passbolt.request('passbolt.setup.get', 'stepId')
      .then(function (stepId) {
        var defaultStepId = 'domain_check';
        var stepId = stepId != undefined && stepId != '' ? stepId : defaultStepId;
        return stepId;
      });
  };

  /**
   * Error page when the setup can't start.
   *
   * @private
   */
  passbolt.setup._initError = function (errorMsg, extraData) {
    passbolt.setup.fatalError(errorMsg, extraData);
  };

  /**
   * init the setup.
   * @param data {array} The setup information
   */
  passbolt.setup.init = function (data) {

    // Build setup data.
    var setupData = {
      settings: {
        token: data.token,
        domain: data.domain
      },
      user: {
        username: data.username,
        firstname: data.firstName,
        lastname: data.lastName,
        id: data.userId
      }
    };

    // Init step settings according to config given.
    for (var stepId in passbolt.setup.steps) {
      // Get corresponding step.
      var stepId = passbolt.setup.steps[stepId].id;
      if (passbolt.setup.workflow[data.workflow][stepId] != undefined) {
        var workflow = passbolt.setup.workflow[data.workflow][stepId];
        passbolt.setup.steps[stepId] = $.extend(passbolt.setup.steps[stepId], workflow);
      }
    }

    passbolt.setup._initPrepareData(setupData)
      .then(passbolt.setup._initValidateUser)
      .then(passbolt.setup._initSetUser)
      .then(passbolt.setup._initValidateSettings)
      .then(passbolt.setup._initSetSettings)
      .then(passbolt.setup._initGetStepId)
      .then(function (stepId) {
        passbolt.setup.goForward(stepId);
      })
      .then(null, function (errorMessage) {
        passbolt.setup._initError(errorMessage, setupData);
      });
  };

  /**
   * Fatal error.
   * @param error {string} the error message
   * @param additionalData {*} data associated to the error
   * @returns {promise}
   */
  passbolt.setup.fatalError = function (error, additionalData) {
    // Display fatal error.
    // Load the setup data.
    return passbolt.setup.get()

      // Treat the setup data and load the template.
      .then(function (setupData) {
        // Remove private key in case it exists.
        // Can't keep this information as it is too sensitive.
        if (setupData.key.privateKeyArmored != undefined) {
          setupData.key.privateKeyArmored = '';
        }

        // Remove passphrase is set.
        if (setupData.key.passphrase != undefined) {
          setupData.key.passphrase = '';
        }

        // Build debug data to render.
        var data = {
          error: error,
          setup: setupData,
          additional: additionalData
        };

        return passbolt.helper.html.loadTemplate($actionsWrapper, './tpl/setup/fatal_error.ejs', 'html', {
          setupData: data
        });
      })

      // Adapt the view.
      .then(function () {
        // Set title.
        $title.text("Damn...");

        // Show debug info on click.
        $('a#show-debug-info').click(function (ev) {
          ev.preventDefault();
          $('#debug-info').removeClass('hidden');
          return false;
        });
      })

      // Flush the setup in case of fatal error.
      // We don't want to keep the buggy data in the plugin.
      .then(function () {
        return passbolt.request('passbolt.setup.flush');
      });
  };

})(jQuery);
