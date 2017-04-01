var constants = require('../constants');

angular.module('berkeleyScheduler').run([
  '$window',
  '$state',
  '$rootScope',
  '$transitions',
  '$mdDialog',
  '$mdMedia',
  '$templateRequest',
  'userService',
  function(
      $window,
      $state,
      $rootScope,
      $transitions,
      $mdDialog,
      $mdMedia,
      $templateRequest,
      userService
  ) {
    $rootScope.$state = $state;

    $transitions.onBefore({to: 'schedule.**'}, function(transition) {
      return transition.injector().getAsync('termAbbrev').then(function(termAbbrev) {
        if (Object.keys(constants.terms).indexOf(termAbbrev) >= 0) {
          return true;
        }

        return $state.target('schedule', {
          termAbbrev: constants.DEFAULT_TERM_ABBREV
        })
      });
    });

    var bodyHeight = null;
    var leftPane = null;
    var leftPaneHeight = null;
    var rightPane = null;

    function getHeight(element) {
      return Math.max(element.offsetHeight, element.clientHeight);
    }

    function setRightPaneHeight() {
      if (leftPane && rightPane) {
        bodyHeight = getHeight(document.body);
        leftPaneHeight = getHeight(leftPane);
        if (leftPaneHeight > bodyHeight) {
          rightPane.style['min-height'] = leftPaneHeight;
        } else {
          rightPane.style['min-height'] = null;
        }
      }
    }

    $rootScope.$on('$viewContentLoaded', function() {
      leftPane = leftPane || document.getElementById('left-pane');
      rightPane = rightPane || document.getElementById('right-pane');
      setRightPaneHeight();
    });
    $window.addEventListener('resize', setRightPaneHeight);

    var showMobUnoptDialog = userService.preferences.showMobUnoptDialog;
    if (showMobUnoptDialog && $mdMedia('xs')) {
      $mdDialog.show({
        templateUrl: 'assets/static/html/mobile_unoptimized.dialog.html',
        controller: 'MobileUnoptimizedDialogCtrl',
        controllerAs: 'vm',
        parent: angular.element(document.body),
        clickOutsideToClose: true
      });
    }

    // Pre-fetch SVG assets
    $templateRequest('assets/gen/sprite.defs.svg');
  }
]);
