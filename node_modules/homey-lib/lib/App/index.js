'use strict';

const Ajv = require('ajv');
const semver = require('semver');
const tinycolor = require('tinycolor2');

const Device = require('../Device');
const Capability = require('../Capability');
const Signal = require('../Signal');

const {
  openAsync,
  readAsync,
  statAsync,
  readFileAsync,
  readDirAsync,
  lstatAsync,
  imageSizeAsync,
  join,
  extname,
  basename,
  dirname,
} = require('../../helpers');

const VALIDATION_LEVELS = [
	'debug',
	'publish',
];
const IMAGE_MARKERS = {
	'.jpg': new Buffer([ 0xFF, 0xD8 ]),
	'.jpeg': new Buffer([ 0xFF, 0xD8 ]),
	'.png': new Buffer([ 0x89, 0x50, 0x4e, 0x47 ]),
}
const IMAGE_SIZES = {
	'app': {
		'small': { width: 250, height: 175 },
		'large': { width: 500, height: 350 },
	},
	'driver': {
		'small': { width: 75, height: 75 },
		'large': { width: 500, height: 500 },
	}
}

class App {

	constructor( path ) {
		this._path = path;

		if( typeof this._path !== 'string' )
			throw new Error('Invalid path');
	}

	debug(...args) {
		if( !this._debug ) return;
		console.log('[dbg]', ...args);
	}

	async validate({
		level = 'debug',
		debug = false,
	} = {}) {
		this._debug = debug;

		this.debug(`Validating "${this._path}"`);

		if( !VALIDATION_LEVELS.includes(level) )
			throw new Error(`Invalid validation level. Allowed levels are: ${VALIDATION_LEVELS}`);

		const levelPublish = ( level === 'publish' );

		let appJson = await readFileAsync( join( this._path, 'app.json' ) );
			appJson = JSON.parse(appJson);

		const appSdk = appJson.sdk || 1;

		const schema = App.getJSONSchema();

		if( levelPublish ) {
			schema.required = schema.required.concat( schema.requiredPublish );
			schema.properties.drivers.items.required = schema.properties.drivers.items.required.concat( schema.properties.drivers.items.requiredPublish );
		}

		const avj = new Ajv({ async: true });
		const validate = avj.compile( schema );
		const valid = await validate( appJson );
		if( valid === false ) throw new Error( JSON.stringify(validate.errors, false, 4) || 'Invalid App JSON' );

		// validate `appJson.id`
		if( !App.isValidId(appJson.id) )
			throw new Error('Invalid id');

		// validate `appJson.version`
		if( !semver.valid(appJson.version) )
			throw new Error('Invalid version');

		if( semver.coerce(appJson.version).toString() !== appJson.version )
			throw new Error(`Invalid version (${appJson.version}), pre-release versions are not allowed`);

		// validate `appJson.compatibility`
		try {
			new (semver.Range)(appJson.compatibility);
		} catch( err ) {
			throw new Error('Invalid compatibility');
		}

		// validate `appJson.permissions`
		if( Array.isArray(appJson.permissions) ) {

			let allowedPermissions = App.getPermissions();

			appJson.permissions.forEach(permission => {
				if( permission.indexOf('homey:app:') === 0 ) return;
				if( typeof allowedPermissions[permission] === 'undefined' )
					throw new Error(`Invalid permission: ${permission}`)
			})
		}

		// validate `appJson.category`
		if( typeof appJson.category !== 'undefined' ) {

			let allowedCategories = App.getCategories();
			let categories = [];

			if( Array.isArray(appJson.category) ) {
				categories = appJson.category;
			} else {
				categories = [ appJson.category ];
			}

			categories.forEach(category => {
				if( !allowedCategories.includes(category) )
					throw new Error(`Invalid category: ${category}`);
			})

		}

		// validate `appJson.drivers`
		if( Array.isArray(appJson.drivers) ) {

			let allowedClasses = Device.getClasses();
			let allowedCapabilities = Device.getCapabilities();

			for( let i = 0; i < appJson.drivers.length; i++ ) {
				const driver = appJson.drivers[i];

				// validate if `/drivers/:id` exists
				await this._ensureFileExistsCaseSensitive( join('drivers', driver.id) );

				// validate `appJson.drivers[].class`
				if( typeof allowedClasses[driver.class] === 'undefined' )
					throw new Error(`Invalid driver class: ${driver.class}`)

				// validate `appJson.drivers[].capabilities`
				driver.capabilities.forEach(capability => {

					let capabilityId = capability.split('.')[0];
					let isSystemCapability = ( typeof allowedCapabilities[capabilityId] !== 'undefined' );
					let isAppCapability = ( typeof appJson.capabilities !== 'undefined' && typeof appJson.capabilities[capabilityId] !== 'undefined' )

					if( !isSystemCapability && !isAppCapability )
						throw new Error(`Invalid capability: ${capability}`)
				})

				// validate `appJson.drivers[].pair`
				if( Array.isArray(driver.pair) ) {
					for( let j = 0; j < driver.pair.length; j++ ) {
						const pairView = driver.pair[j];

						// validate if navigation links to an existing view
						if( typeof pairView.navigation !== 'undefined' ) {
							let prevId = pairView.navigation.prev;
							if( prevId ) {
								let found = driver.pair.find(pairView => {
									return pairView.id === prevId;
								})

								if( !found )
									throw new Error(`Invalid navigation.prev: ${prevId}`);
							}

							let nextId = pairView.navigation.next;
							if( nextId ) {
								let found = driver.pair.find(pairView => {
									return pairView.id === nextId;
								})

								if( !found )
									throw new Error(`Invalid navigation.next: ${nextId}`);
							}
						}

						// validate if `/drivers/:id/pair/(/appJson.drivers[].pair[].id).html` exists
						if( typeof pairView.template === 'undefined' ) {
							await this._ensureFileExistsCaseSensitive( join('drivers', driver.id, 'pair', `${pairView.id}.html`) );
						}
					}
				}

				// validate 'app.Json.drivers[].settings[].zwave'
        if (driver.zwave && Array.isArray(driver.settings)) {
          for (let j = 0; j < driver.settings.length; j++) {
            let setting = driver.settings[j];

            if (setting.type &&
              setting.type === 'group' &&
              setting.children &&
                Array.isArray(setting.children)) {
                  for (let k = 0; k < setting.children.length; k++) {
                    let childSetting = setting.children[k];
                    if (childSetting)
                    this._checkZwaveForSetting(driver, childSetting);
                  }
            } else {
              this._checkZwaveForSetting(driver, setting);
            }
          }
        }

				// validate `appJson.drivers[].images`
				if( levelPublish ) {
					await this._validateImages(driver.images, 'driver');
				}
			}
		}

		// validate `appJson.capabilities`
		if( typeof appJson.capabilities !== 'undefined' ) {
			for( let capabilityId in appJson.capabilities ) {
				const capability = appJson.capabilities[capabilityId];
				const capabilityInstance = new Capability(capability);

				try {
					await capabilityInstance.validate();
				} catch( err ) {
					throw new Error(`Invalid capability: ${capabilityId}\n${err.message}`)
				}

				if(capability.icon) {
          await this._ensureFileExistsCaseSensitive(capability.icon);
				}
			}
		}

		// validate `appJson.signals`
		if( typeof appJson.signals !== 'undefined' ) {
			for( let frequency in appJson.signals ) {
				for( let signalId in appJson.signals[frequency] ) {
					let signal = new Signal( appJson.signals[frequency][signalId], { frequency });
					try {
						await signal.validate();
					} catch( err ) {
						throw new Error(`Invalid signal: ${frequency}.${signalId}\n${err.message}`)
					}
				}
			}
		}

		// validate `appJson.drivers`
		if( appJson.flow ) {
  		for( const type in appJson.flow ) {
    		const cards = appJson.flow[type];
    		if(Array.isArray(cards)) {
      		for( let i = 0; i < cards.length; i++ ) {
        		const card = cards[i];
        		this._validateFlowCard(card, `flow.${type}[${i}]`);
      		}
    		}
  		}

    }

		// validate if `/locales/:lang.json` exists & is valid
		if( await this._fileExistsCaseSensitive('locales') ) {
  		let allowedLocales = App.getLocales();
  		let locales = await this._getDirectoryContents('locales');
  		for( let i = 0; i < locales.length; i++ ) {
  			let locale = locales[i];
  			if( extname(locale) !== '.json' ) continue;
  			let bn = basename(locale, '.json');

  			if( !allowedLocales.includes(bn) )
  				throw new Error(`Invalid locale: /locales/${bn}.json\nAllowed locales are: ${allowedLocales}`);

  			try {
  				let localeJson = await readFileAsync(locale, 'utf8');
  				JSON.parse(localeJson);
  			} catch( err ) {
  				throw new Error(`Malformed locale: /locales/${bn}.json\n${err.message}`);
  			}
  		}
		}

		// validate if `/app.js` exists
		if( appSdk === 1 ) {
			await this._ensureFileExistsCaseSensitive('app.js');
		}

		// validate `/env.json`
		if( await this._fileExistsCaseSensitive('env.json') ) {
			let envJson;
			try {
				envJson = await readFileAsync( join(this._path, 'env.json'), 'utf8');
				envJson = JSON.parse(envJson);
			} catch( err ) {
				throw new Error(`Malformed file: /env.json\n${err.message}`);
			}

			if( envJson ) {
				for( let key in envJson ) {
					if( key.toUpperCase() !== key )
						throw new Error(`Invalid /env.json key, must be uppercase: ${key}`);

					let value = envJson[key];
					if( typeof value !== 'string' )
						throw new Error(`Invalid /env.json value, must be of type string: ${value}`);

				}
			}
		}

		// validate if `/assets/icon.svg` exists
		await this._ensureFileExistsCaseSensitive( join('assets', 'icon.svg') );

		// validate if `/README.md` exists
		await this._ensureFileExistsCaseSensitive( join('README.md') );

		// validate `/settings/`
		if( await this._fileExistsCaseSensitive('settings') ) {
			await this._ensureFileExistsCaseSensitive( join('settings', 'index.html') );
		}

		if( levelPublish ) {
			await this._validateImages(appJson.images, 'app');
			await this._validateModules();
		}

		if( appJson.brandColor ) {
  		if(!this.constructor.isValidBrandColor(appJson.brandColor))
  		  throw new Error('The color defined in `brandColor` is too bright.');
		}

		this.debug(`Validated successfully`);

	}

  _checkZwaveForSetting(driver, setting) {
		if (!driver || !setting || !setting.zwave) return;
    else if (typeof setting.zwave.index !== 'number' || typeof setting.zwave.size !== 'number') throw new Error(`Missing property in "zwave" at ${driver.id}, ${setting.id}`);
    else if ( (setting.attr && typeof setting.attr.max === 'number') || typeof setting.max === 'number' ) {
      let signed,
          max,
          stepsize;
      let size = setting.zwave.size;

      typeof setting.attr.max === 'number' ? max = setting.attr.max : max = setting.max;
      typeof setting.attr.step === 'number' ? stepsize = setting.attr.step : 1;

      if (stepsize > 1) max /= stepsize;
      typeof setting.zwave.signed === 'boolean' ? signed = setting.zwave.signed : signed = true;

      let maxSigned = (Math.pow(2, size * 8) / 2) - 1;
      let maxUnsigned = Math.pow(2, size * 8) - 1;

      if (signed && (max) > maxSigned) {
        throw new Error(`Value cannot be signed: ${driver.id}, ${setting.id}. Max value: ${maxSigned}, actual value: ${max}`);
      } else if (!signed && (max) > maxUnsigned) {
        throw new Error(`Max value out of bounds: ${driver.id}, ${setting.id}.  Max value: ${maxUnsigned}, actual value: ${max}`);
      }
    }
  }

	async _getDirectoryContents(filepath) {
		await this._fileExistsCaseSensitive(filepath);

		filepath = join( this._path, filepath );

	    return readDirAsync(filepath).then( files => {
		    return files.map(file => {
			    return join( filepath, file );
			});
	    });
	}

	async _ensureFileExistsCaseSensitive(filepath) {
		let exists = await this._fileExistsCaseSensitive( filepath );
		if( exists !== true )
			throw new Error(`Filepath does not exist: ${filepath}`);
	}

	async _fileExistsCaseSensitive(filepath) {
		filepath = join( this._path, filepath );
		let dir = dirname( filepath );

		try {
				let stat = await statAsync( dir );
				if( !stat.isDirectory() ) return false;

				let contents = await readDirAsync( dir );
				return contents.indexOf( basename(filepath) ) > -1;
		} catch( err ) {
			return false;
		}
	}

	async _validateImages(imagesObj, type) {

		const sizes = [ 'small', 'large' ];
		for( let i = 0; i < sizes.length; i++ ) {
			let size = sizes[i];
			let imagePath = imagesObj[size];
			let extension = extname(imagePath);

			if( typeof IMAGE_MARKERS[extension] === 'undefined' )
				throw new Error(`Invalid image extention: ${extension}`);

			await this._ensureFileExistsCaseSensitive( imagePath );

			let compareBuffer = IMAGE_MARKERS[extension];
			let imageBytes = await this._readBytes( imagePath, compareBuffer.length );

			if( !imageBytes.equals(compareBuffer) )
				throw new Error(`Invalid image: ${imagePath}`);

			let requiredSize = IMAGE_SIZES[type][size];
			let imageSize = await imageSizeAsync( join( this._path, imagePath ) );
			if( imageSize.width !== requiredSize.width
			 || imageSize.height !== requiredSize.height )
			 	throw new Error(`Invalid image size (${imageSize.width}x${imageSize.height}): ${imagePath}\nRequired: ${requiredSize.width}x${requiredSize.height}`);
		}
	}

	async _validateModules() {

  	const nodeModulesPath = join(this._path, 'node_modules');

    try {
  	  await statAsync(nodeModulesPath);
    } catch(err) {
      return;
    }

		// Make sure there are no symlinked (`npm link`) modules left in `node_modules`.
		for (let file of await readDirAsync(nodeModulesPath)) {
			let stat;
			try {
				stat = await lstatAsync(join(nodeModulesPath, file));
			} catch(e) {
				throw Error(`Invalid module '${file}' in 'node_modules': ` + e.message);
			}
			if (stat.isSymbolicLink()) {
				throw Error(`Invalid module '${file}' in 'node_modules': is a symbolic link`);
			}
		}
	}

	_validateFlowCard(card, errorPath) {
  	if( card.titleFormatted && card.args && card.args.length ) {

  	  const findStringBetween = (str, first, last) => {
        const r = new RegExp(`${first}(.*?)${last}`, 'gm');
        return str.match(r);
      };

      const checkTitleFormatted = (titleFormatted, errorPath) =>  {
      	const args = card.args.reduce((obj, arg) => {
        	return {
          	...obj,
          	[arg.name]: false,
        	};
        }, {});

        if( card.droptoken )
          args.droptoken = false;

      	const argsMatches = findStringBetween(titleFormatted, '\\[\\[', '\\]\\]');
      	argsMatches.forEach(argMatch => {
        	const argName = argMatch.substring(2, argMatch.length-2);
        	if( typeof args[argName] === 'undefined' )
            throw Error(`Invalid [[${argName}]] in ${errorPath}.titleFormatted`);

        	if( args[argName] === true )
            throw Error(`Duplicate [[${argName}]] in ${errorPath}.titleFormatted`);

        	if( args[argName] === false )
        	  args[argName] = true;
      	});

      	for( const argName in args ) {
        	if( args[argName] === false )
        	  throw Error(`Missing [[${argName}]] in ${errorPath}`);
      	}
      };

    	if( typeof card.titleFormatted === 'string' ) {
      	checkTitleFormatted(card.titleFormatted, `${errorPath}.titleFormatted`)
    	} else {
      	for( let language in card.titleFormatted ) {
        	checkTitleFormatted(card.titleFormatted[language], `${errorPath}.titleFormatted.${language}`);
    	  }
    	}

  	}
	}

	async _readBytes( filepath, numBytes ) {
		filepath = join( this._path, filepath );

		const fd = await openAsync(filepath, 'r');
    const buffer = new Buffer(numBytes);
    await readAsync(fd, buffer, 0, numBytes, 0);
    return buffer;
	}

	static isValidId( appId ) {
		if( typeof appId !== 'string' ) return false;
		if( appId.length < 1 ) return false;
		if( appId.split('.').length < 2 ) return false;
		if( !(/^[a-zA-Z0-9_.-]*$/g).test(appId) ) return false;
		return true;
	}

	static isValidBrandColor( color ) {
		return tinycolor(color).getBrightness() <= 184; // empirically determined by many colorpicker samples
	}

	static getJSONSchema() {
		const schema = require('../../assets/app/schema.json');
		return JSON.parse( JSON.stringify( schema ) );
	}

	static getPermissions() {
		const permissions = require('../../assets/app/permissions.json');

		if( typeof join === 'function' ) {
  		for( let id in permissions ) {
  			let permission = permissions[id];
  			permission.icon = join(__dirname, '..', '..', 'assets', 'app', 'permissions', `${id.replace(/\:/g, '-')}.svg` )
  		}
		}

		return permissions;
	}

	static getCategories() {
		return [ 'lights', 'video', 'music', 'appliances', 'security', 'climate', 'tools', 'internet', 'localization', 'energy' ];
	}

	static getLocales() {
		return [ 'ab', 'aa', 'af', 'ak', 'sq', 'am', 'ar', 'an', 'hy', 'as', 'av', 'ae', 'ay', 'az', 'bm', 'ba', 'eu', 'be', 'bn', 'bh', 'bi', 'bs', 'br', 'bg', 'my', 'ca', 'ch', 'ce', 'ny', 'zh', 'cv', 'kw', 'co', 'cr', 'hr', 'cs', 'da', 'dv', 'nl', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fj', 'fi', 'fr', 'ff', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'he', 'hz', 'hi', 'ho', 'hu', 'ia', 'id', 'ie', 'ga', 'ig', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'kl', 'kn', 'kr', 'ks', 'kk', 'km', 'ki', 'rw', 'ky', 'kv', 'kg', 'ko', 'ku', 'kj', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'gv', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mh', 'mn', 'na', 'nv', 'nd', 'ne', 'ng', 'nb', 'nn', 'no', 'ii', 'nr', 'oc', 'oj', 'cu', 'om', 'or', 'os', 'pa', 'pi', 'fa', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'ru', 'sa', 'sc', 'sd', 'se', 'sm', 'sg', 'sr', 'gd', 'sn', 'si', 'sk', 'sl', 'so', 'st', 'es', 'su', 'sw', 'ss', 'sv', 'ta', 'te', 'tg', 'th', 'ti', 'bo', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'cy', 'wo', 'fy', 'xh', 'yi', 'yo', 'za', 'zu' ];
	}

}

module.exports = App;