const Homey = require('homey');

const logArray = [];
const DEBUG = process.env.DEBUG === '1';

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + month + day + "-" + hour + ":" + min + ":" + sec;
}

function getAllFuncs(obj) {
    if (!obj) return [];

    if (obj instanceof Error) {
        console.log("Error object");
        console.log(obj.name);
        console.log(obj.message);
        console.log(obj.stack);
        return;
    }

    var props = [];
    do {
        props = props.concat(Object.getOwnPropertyNames(obj));
    } while (obj = Object.getPrototypeOf(obj));

    return props.sort();
}

function writelog(level, line, notification, functions, implementation) {

   switch(level) {
       case 'error':
           if (notification !== false) {
               Homey.ManagerNotifications.registerNotification({
                   excerpt: line
               }, function (err, notification) {
                   if (DEBUG) console.log('Notification added');
                   if (line) return console.error(line);
               });
           } else {
               if (line) return console.error(line);
           }
           break;
       case 'debug':
           if (!DEBUG) break;
           if (typeof line === 'object') {
               let obj = line;
               if (!obj) {
                   this.writelog('info', 'object: UNDEFINED');
                   return;
               }

               writelog('info', typeof obj + ' ' + obj.constructor.name);
               if (implementation) {
                  writelog('info', typeof obj + ' ' + obj.constructor);
               }
               writelog('info', 'PROPERTIES: ' + JSON.stringify(obj, null, 2));
               if (functions) {
                  writelog('info', 'FUNCTIONS:' + JSON.stringify(getAllFuncs(obj), null, 2));
               }
               break;
           }
           // NOTE: fall through
      case 'info':   
         var logLine = getDateTime() + "   " + line;
         console.log( logLine );

         if (logArray.length >= 50) {
            logArray.shift();
         }
         logArray.push(logLine);
         break;
   }
}

function getLogLines() {
   writelog('debug', "getLogLines called");
   return logArray;
}

module.exports = {
    debug: function (line, functions, implementation) {
        writelog('debug', line, null, functions, implementation);
    },
    info: function (line) {
        writelog('info', line);
    },
    error: function (line, notification) {
        writelog('error', line, notification);
    },
    writelog: function (level, line) {
        writelog(level, line);
    },
    getLogLines: function () {
        return getLogLines();
    }
};
