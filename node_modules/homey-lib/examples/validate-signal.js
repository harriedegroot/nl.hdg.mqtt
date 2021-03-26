'use strict';

const definition = {
	dsof: [ 	1,1,1,1,1,1,1,1,1,
			0,0,1,0,1,0,1,0,1,0,1,0,1,1,0,0,1,1,0,0,1], // preamble = 3f5
	words: [
	 [1, 0], // 0
	 [0, 1], // 1
	 ],
	 eof: [],
	manchesterUnit: 10, //us
    manchesterMaxUnits: 10,
	carrier: 433934000, 
	repetitions: 10,
	sensitivity: 0.5,
	interval: 500,
	packing: true,
    rxTimeout: 200,
    cmds: {
	    "Test":[0,1,0,1]
    },
	modulation: {
		type: 'GFSK',
		baudRate: 100000,
		channelSpacing: 100000,
		channelDeviation: 50000,
	}
}

const Signal = require('..').Signal;
const signal = new Signal( definition, { frequency: '433' });

signal.validate({
	debug: true,
}).then(() => {
	console.log('Signal validated successfully');
}).catch( err => {
	console.error('Signal did not validate');
	console.error( err );
})