'use strict';

const definition = {
	type: 'prontohex',
	carrier: 38000, 
	repetitions: 10,
    cmds: {
	    "Test": "0000 0073 0000 000C 0020 0020 0040 0020 0020 0020 0020 0020 0020 0020 0020 0020 0020 0040 0020 0020 0020 0020 0020 0020 0040 0040 0020 0CA4"
    },
	modulation: {
		type: 'GFSK',
		baudRate: 100000,
		channelSpacing: 100000,
		channelDeviation: 50000,
	}
}

const Signal = require('..').Signal;
const signal = new Signal( definition, { frequency: 'ir' });

signal.validate({
	debug: true,
}).then(() => {
	console.log('Signal validated successfully');
}).catch( err => {
	console.error('Signal did not validate');
	console.error( err );
})