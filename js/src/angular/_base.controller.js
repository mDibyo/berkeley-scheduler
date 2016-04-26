'use strict';

function BaseCtrl($state, $window) {
  var vm = this;

  vm.goToState = goToState;
  vm.goToExternal = goToExternal;

  function goToState(to, params, options) {
    $state.go(to, params, options);
  }

  function goToExternal(href) {
    $window.open(href, '_blank');
  }
}

module.exports = BaseCtrl;
