var dongle = require("./lib/dongle");
var log = require("debug")("nqm-k4203-z-interface:test-dongle");

dongle.getSMSMessages(1, 1, 100, function(err, result) {
  if (err) {
    log("failed to get SMS: " + err.message);
  } else {
    log(result);
    dongle.deleteSMS(3, function(err, result) {
      if (err) {
        log("failed to delete SMS: " + err.message);
      } else {
        log(result);
        dongle.sendSMS("0797333333","testing",Math.random(), function(err, result) {
          if (err) {
            log("failed to send SMS: " + err.message);
          } else {
            log(result);
          }          
        });
      }
    });
  }  
});

