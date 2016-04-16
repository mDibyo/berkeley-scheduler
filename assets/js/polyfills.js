Array.prototype.remove || (Array.prototype.remove = function(item) {
  var index = this.indexOf(item);
  if (index >= 0) {
    this.splice(index, 1);
  }
  return item;
});