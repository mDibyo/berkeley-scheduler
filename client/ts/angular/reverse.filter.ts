import angular = require('angular');

angular.module('berkeleyScheduler').filter('reverse', function() {
  return function(items: Array<any>) {
    return items.slice().reverse();
  };
});
