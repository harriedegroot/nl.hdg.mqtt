'use strict';

const {
	validate,
	genericValidator,
	irValidator,
	rfValidator,
	rf433Validator,
	rf868Validator,
	modulationValidator,
	prontoValidator,
} = require('./validators.js');

class Signal {
	
	constructor( signal, { frequency = undefined } = {}) {
		this._signal = signal;
		this._frequency = frequency;
		
		this._check = this._check.bind(this);
	}
	
	debug(...args) {
		if( !this._debug ) return;
		console.log('[dbg]', ...args);
	}
	
	_check( message, result ) {
		if( result !== true )
			throw new Error( message );
	}
	
	async validate({
		debug = false
	} = {}) {
		this._debug = debug;
		
		this.debug(`Validating signal`);
		
		if( !this._signal )
			throw new Error('Invalid Signal');
				
		if( this._signal.type === 'prontohex' ) {
			this._validateProntohex();
		} else if( typeof this._signal.type === 'undefined' ) {
			this._validateRegular();
		} else {
			throw new Error('Invalid Signal type');
		}
		
		if( this._frequency === '433' ) {
			this._validate433();
		} else if( this._frequency === '868' ) {
			this._validate868();
		} else if( this._frequency === 'ir' ) {
			this._validateInfrared();
		} else {
			throw new Error('Invalid Frequency');
		}
			
		this.debug(`Validated successfully`);
	}
	
	_validateWithEngine( validatorEngine ) {
		return validate(validatorEngine, this._check, this._signal);		
	}
	
	_validateProntohex() {
		this._check( 'mandatory_fields', this._signal.hasOwnProperty('cmds') );
		this._validateWithEngine( prontoValidator );
	}
	
	_validateRegular() {
		this._check( 'mandatory_fields', this._signal.hasOwnProperty('sof') || this._signal.hasOwnProperty('eof') || this._signal.hasOwnProperty('words') );
		this._validateWithEngine( genericValidator );
		this._validateWithEngine( rfValidator );
		
	}
	
	_validate433() {
		this._validateWithEngine( modulationValidator );
		this._validateWithEngine( rf433Validator );
	}
	
	_validate868() {
		this._validateWithEngine( modulationValidator );
		this._validateWithEngine( rf868Validator );
	}
	
	_validateInfrared() {
		this._validateWithEngine( irValidator );
	}
	
}

module.exports = Signal;