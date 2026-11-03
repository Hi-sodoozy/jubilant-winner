(function () {
  function localDate(date) {
    var now = date || new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    return now.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function missing(error) {
    var message = error && error.message ? error.message : '';
    return /could not find the function/i.test(message);
  }

  function rpc(sb, name, args) {
    var sent = {};
    var key;
    args = args || {};
    for (key in args) {
      if (Object.prototype.hasOwnProperty.call(args, key)) sent[key] = args[key];
    }
    sent.on_date = localDate();
    return sb.rpc(name, sent).then(function (result) {
      if (!missing(result.error)) return result;
      return sb.rpc(name, args);
    });
  }

  window.ID_LOCAL_DATE = localDate;
  window.ID_RPC = rpc;
})();
