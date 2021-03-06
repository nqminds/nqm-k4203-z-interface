module.exports = (function() {
  "use strict";
  
  var log = require("debug")("nqm-k4203-z-interface:sms-monitor");
  var EventEmitter = require("events").EventEmitter;
  var util = require("util");
  var dongle = require("./dongle");
  var _ = require("lodash");
  
  function SMSMonitor() {
    EventEmitter.call(this);
  }
  
  util.inherits(SMSMonitor, EventEmitter);
  
  SMSMonitor.prototype.start = function(pollInterval) {
    var self = this;
    this._pollInterval = pollInterval || 10000;
    // This ensures DNS is working on the dongle.
    dongle.resetRemindFlag(function() {
      // Start polling.
      startPolling.call(self);                    
    });
  };
  
  SMSMonitor.prototype.sendResponse = function(to, response, id, cb) {
    cb = cb || function() {};
    log("sending SMS to %s [%s]", to, response);
    dongle.sendSMS(to, response, id, cb);
  };
  
  SMSMonitor.prototype.getParam = function(paramName, cb) {
    dongle.getParam(paramName, cb);
  };
  
  SMSMonitor.prototype.connect = function(cb) {
    dongle.connect(cb);
  };
  
  SMSMonitor.prototype.disconnect = function(cb) {
    dongle.disconnect(cb);
  };
  
  SMSMonitor.prototype.rebootDevice = function() {
    dongle.rebootDevice();
  };
  
  SMSMonitor.prototype.autoConnect = function() {
    dongle.autoConnect();
  };
  
  var startPolling = function() {
    if (!this._timer) {
      this._timer = setTimeout(pollHandler.bind(this), this._pollInterval || 10000);
    }
  };
  
  var deleteMessage = function(id, cb) {
    cb = cb || function() {};
    dongle.deleteSMS(id, cb);
  };
   
  var pollHandler = function() {
    var self = this;
    this._timer = 0;
    
    log("polling");
    
    dongle.getSMSMessages(1,1,100,function(err, result) {
      if (err) {
        log("failed to get SMS list: " + err.message);
        // Re-start polling.
        startPolling.call(self);
      } else {
        if (result && result.messages && result.messages.length > 0) {
          _.forEach(result.messages, function(msg) {
            // Delete the message before dispatching - otherwise might get into a loop if
            // for example a "reboot" command causes a reboot when dispatched before the 
            // message is deleted.
            deleteMessage(msg.id);
            if (msg.isNew) {
              if (msg.body && msg.body.indexOf("#") === 0) {
                self.emit("msg", msg); 
              } else {
                log("message not command => ignoring [%j]", msg);
                self.sendResponse(msg.from, "unknown command: " + msg.body, msg.id);
              }              
            } else {
              log("message not new => ignoring [%j]", msg);
            }
          });
          dongle.resetRemindFlag(function() {
            // Re-start polling after all messages have been handled by listeners.
            startPolling.call(self);                    
          });
        } else {
          // Re-start polling after all messages have been handled by listeners.
          startPolling.call(self);          
        }
      }
    });
  };
  
  return SMSMonitor;
}());
