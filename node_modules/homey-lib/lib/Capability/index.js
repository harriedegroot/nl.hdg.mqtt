'use strict';

const Ajv = require('ajv');

let capabilitiesCache;

class Capability {
	
	constructor( capability ) {
		this._capability = capability;
	}
	
	debug(...args) {
		if( !this._debug ) return;
		console.log('[dbg]', ...args);
	}
	
	async validate({
		debug = false
	} = {}) {
		this._debug = debug;
		
		this.debug(`Validating capability`);
		
		const schema = Capability.getJSONSchema();
		const avj = new Ajv({ async: true });
		const validate = avj.compile( schema );
		const valid = await validate( this._capability );
		if( valid === false ) throw new Error( JSON.stringify(validate.errors, false, 4) || 'Invalid Capability' );
			
		this.debug(`Validated successfully`);
	}
	
	static getJSONSchema() {
		return require('../../assets/capability/schema.json');	
	}
	
	static getCapabilities() {
  	if( capabilitiesCache ) return capabilitiesCache;
  	
  	const capabilities = require('../../assets/capability/capabilities.json');
  	capabilitiesCache = capabilities.reduce((obj, capabilityId) => {
      obj[capabilityId] = require(`../../assets/capability/capabilities/${capabilityId}.json`)
      obj[capabilityId] = Capability._composeCapability( capabilityId, obj[capabilityId] );
      return obj;
  	}, {});
  	return capabilitiesCache;
	}
	
	static getCapability(id) {
  	const capabilities = Capability.getCapabilities();
  	const capability = capabilities[id];
  	if( !capability )
  	  throw new Error('invalid_capability');
    return capability;  	
	}
	
	static _composeCapability( capabilityId, capability ) {
  	if( capability.flow ) console.warn(`Warning: using \`capability.flow\` (${capabilityId}), expected a \`capability.$flow\``);
  	if( capability.$flow ) {
    	['triggers', 'conditions', 'actions'].forEach(type => {
      	const cards = capability.$flow[type];
      	if( !Array.isArray(cards) ) return;
      	cards.forEach(card => {
        	
        	if( Array.isArray(card.args) ) { 
          	card.args.forEach(arg => {
            	// allow `"values": "$values"` to copy values from the capability          	
            	if( arg.type === 'dropdown' ) {
              	if( arg.values === '$values' ) {
                	arg.values = capability.values;
            	  }
              }
            });
          }
          
          //Replace template variables
          if( Array.isArray(card.tokens) ) {
          	card.tokens.forEach(token => {
            	if( token.name === '$id' )
              	token.name = capabilityId;
              	
            	if( token.type === '$type' )
              	token.type = capability.type;
              	
              if( token.title === '$title' )
                token.title = capability.title;              
            });
          }
      	});
    	})
  	}
  	
  	return capability;
	}
	
}

module.exports = Capability;
