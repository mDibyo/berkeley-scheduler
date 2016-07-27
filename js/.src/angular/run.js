angular.module('scheduleBuilder').run([
  '$state',
  '$rootScope',
  '$mdDialog',
  '$mdMedia',
  'scheduleFactory',
  function($state, $rootScope, $mdDialog, $mdMedia, scheduleFactory) {
    $rootScope.$state = $state;

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
  }
]);
