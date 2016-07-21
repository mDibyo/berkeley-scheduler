angular.module('scheduleBuilder').run([
  '$mdDialog',
  '$mdMedia',
  'scheduleFactory',
  function($mdDialog, $mdMedia, scheduleFactory) {
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