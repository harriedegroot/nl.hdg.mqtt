'use strict';

const App = require('..').App;
const app = new App( process.argv[2] );

app.validate({
	level: process.argv[3] || 'publish',
	debug: true,
}).then(() => {
	console.log('App validated successfully');
}).catch( err => {
	console.error('App did not validate');
	console.error( err );
})