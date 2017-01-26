angular.module('berkeleyScheduler').run([
  '$window',
  '$state',
  '$rootScope',
  '$mdDialog',
  '$mdMedia',
  '$templateRequest',
  'userService',
  function($window, $state, $rootScope, $mdDialog, $mdMedia, $templateRequest, userService) {
    $rootScope.$state = $state;

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
    var showSendEmailDialog = userService.preferences.showSendEmailDialog;
    if ($mdMedia('xs')) {
      if (showMobUnoptDialog) {
        $mdDialog.show($mdDialog.mobileUnoptimizedPreset());
      }
    } else {
      if (showSendEmailDialog) {
        $mdDialog.show($mdDialog.sendEmailPreset());
      }
    }

    // Pre-fetch SVG assets
    $templateRequest('assets/gen/sprite.defs.svg');
  }
]);
