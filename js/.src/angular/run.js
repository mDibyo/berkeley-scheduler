angular.module('scheduleBuilder').run([
  '$window',
  '$state',
  '$rootScope',
  '$mdDialog',
  '$mdMedia',
  '$templateRequest',
  'scheduleFactory',
  function($window, $state, $rootScope, $mdDialog, $mdMedia, $templateRequest, scheduleFactory) {
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

    var showMobUnoptDialog =
      scheduleFactory.getPreferences()['showMobUnoptDialog'];
    if (showMobUnoptDialog && $mdMedia('xs')) {
      $mdDialog.show({
        templateUrl: 'html/mobile_unoptimized.dialog.html',
        controller: 'MobileUnoptimizedDialogCtrl',
        controllerAs: 'vm',
        parent: angular.element(document.body),
        clickOutsideToClose: true
      });
    }

    // Pre-fetch SVG assets
    $templateRequest('svg/final/sprite.defs.svg');
  }
]);
