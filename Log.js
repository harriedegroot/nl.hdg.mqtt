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

           const message = typeof line === 'object' ? (line.error_description || line.error || line) : line;

           if (notification === true && message && typeof message === 'string') {
                Homey.ManagerNotifications.registerNotification({
                    excerpt: message
                }, function (err, notification) {
                    if (DEBUG) console.log('Notification added');
                    if (line) return console.error(line);
                });
           } else {
               if (line) return console.error(line);
           }
           break;
       case 'debug':
           if (typeof line === 'object') {
               if (!DEBUG) break;
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

         if (logArray.length >= 100) {
            logArray.pop();
         }
         logArray.unshift(logLine);
         break;
   }
}

function getLogLines() {
   return logArray;
}

function clearLogLines() {
    logArray.length = 0;
}

module.exports = {
    LEVELS: ['off', 'error', 'warning', 'info', 'debug'],
    level: DEBUG ? 4 : 3,
    getLevel: function () {
        return this.LEVELS[this.level];
    },
    setLevel: function (level) {
        if (level !== undefined) {
            this.level = typeof level === 'string' ? this.LEVELS.indexOf(level) : level;
            if (level === 0) {
                clearLogLines();
            }
        }
    },
    debug: function (line, functions, implementation) {
        if(this.level >= 4) writelog('debug', line, null, functions, implementation);
    },
    info: function (line) {
        if (this.level >= 3) writelog('info', line);
    },
    // wraning...
    error: function (line, notification) {
        if (this.level >= 1) writelog('error', line, notification);
    },
    writelog: function (level, line) {
        writelog(level, line);
    },
    getLogLines: function () {
        return getLogLines();
    },
    clearLogLines: function () {
        clearLogLines();
    }
};
