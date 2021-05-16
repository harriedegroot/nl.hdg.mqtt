## Change Log  

#### 3.6.0
- Home Assistant Discovery driver
- Renamed `setTopic` to `commandTopic`
- Fixed topic configuration for MQTT Devices created from discovery
- Improved discovery topic subscription
- Removed success popup when a new device is added from descovery

#### 3.5.5
- Resolved an issue for boolean handling in output templates

#### 3.5.4
MQTT Device:
- Selected icon styling improvements
- Prevent calling the set topic for state changes from mqtt
- Resolved a parsing error for string messages send to topics with an output template
- MathJS equality expression fix for comparing strings in value templates

#### 3.5.3
- MQTT Device: mimetype fix for uploading SVG icons

#### 3.5.2
- HA Discovery: Cover position template fix for HA version 2021.6+ ([issue 56](https://github.com/harriedegroot/nl.hdg.mqtt/issues/56))
- Security: Homey, jsonPath & lodash NPM package upgrades

#### 3.5.1
- Upload custom icon fixes
- Remove uploaded icons on cancel pairing OR uninstall of MQTT Device

#### 3.5.0
- MQTT Device icons

#### 3.4.2
- MQTTDevice: Display capability details
- Readme update

#### 3.4.1
- MQTTDevice: allow mathJS expressions as output template for outgoing messages
- MQTTDevice: removed default '{{value}}' output template

#### 3.4.0
- MQTTDevice: allow mathJS expressions as value template for incoming messages

#### 3.3.3
- Color temperature fix (HA => Homey)

#### 3.3.2
- Color temperature fix (Homey => HA)

#### 3.3.1
- MQTT Device: allow the same topic to be used for multiple capabilities

#### 3.3.0
MQTT Device additions:
- allow the same capability to be added multiple times
- provide a custom display name (capability title)
- edit capabilities while creating a new MQTT Device

#### 3.2.0
- Unsubscribe from topics
- Discovery: skip unknown devices

#### 3.1.9
- HA Dispatcher: REVERTED: removed device name from entity name
    
#### 3.1.8
- HA Dispatcher: removed device name from entity name
  
#### 3.1.7
- Skip non-homie device topics in homieDevice message handling
  
#### 3.1.6
- Logging: parse objects to JSON string for debugging puposes
  
#### 3.1.5
- lib bump: missing packages
  
#### 3.1.4
- Homey lib update to v2.9.0
  
#### 3.1.3
- Changed default HA status topic to: homeassistant/status
  
#### 3.1.2
- Added brand color
  
#### 3.1.1
- Fix for publishing '0' and 'false' payloads
  
#### 3.1.0
- MQTT device: grab input value from json messages (jsonPath)
- MQTT device: format output message payload to json (JSON-T template)
  
#### 3.0.3
- [FIX] MQTT device topic registration
  
#### 3.0.2
- HA discovery: set cover position fix (Fibaro shutters)
- Removed benefit message from settings page
  
#### 3.0.1
- FIX: changing settings of an MQTT Device
- FIX: MQTT Device onoff values (false, 0) + state updates
- Prevent message loops when the MQTT device state is updated by a message
- Keep the MQTT device topics in sync
- Add remove MQTT Device capabilities via advanced device config (json)
- Change MQTT device topics in advanced device config (json)
  
#### 3.0.0  
- Upgrade to Homey SDK v3
- Added flow card to trigger a broadcast
- Removed guid from default homie topic at app install
- Delayed the initial broadcast by 30 sec.
- Removed 'icon' from Home Assistant payloads
- cast enum values to string
  
#### 2.2.5  
- Added MQTT device setting to modify the `onoff` capability output (`true`/`false`, `on`/`off`, etc.)
- Cleanup MQTT Device topic settings
  
#### 2.2.4  
- Manage topics after the device is installed (device `advanced settings` menu)
- Added `percentage scaling` device setting
- Fixed a bug in the device manager when adding or removing Homey devices
- Increased max log lines to 1000 for debug level
  
#### 2.2.3  
- Flowcard Triggers & Actions
- Improved performance of Homie discovery devices list
  
#### 2.2.2  
- Updated Icons & Images
- Fixed a small styling issue in MQTT Device capabilities list
  
#### 2.2.1  
- Homie MQTT Discovery
  
#### 2.2.0  
- MQTT Device
  
#### 2.1.9  
- Retry topic subscriptions on failure & manual broadcast  
  
#### 2.1.8  
- HA Discovery: covers/blinds
    
#### 2.1.7  
- PR: MQTT Explorer url
- Updated readme
- Athom api update (2.1.178)
- Bug fixes & stability improvements

#### 2.1.6  
- [FIXED] Devices are not displayed in app settings on clean install
  
#### 2.1.5  
- Option to enable/disable all devices
- Performance & stability improvements 
  
#### 2.1.4  
- Display broadcast progress  
  
#### 2.1.3  
- Updated Homey api to version 2.1.172  
- Home Assistant Discovery: on_command_type for lights set to 'last'
    
#### 2.1.2  
- Homie Convention integer datatype fix
  
#### 2.1.1  
- Improved app startup & shutdown procedures 
- Resolved issues with Client & Hub app install order
- Resolved some issues in MQTT Client app (un)install handling
- Skip normalization of custom topics
- Introduced log levels for 20% speed improvement
- Home Assistant status topic fix
- Home Assistant binary sensors fix
- Fixed the detection of config changes
- General bug fixes & stability
  
#### 2.1.0  
- HA Discovery (beta)
- Simplified settings page + added many options
- App performance & stability (introduction of a MessageQueue)
- Birth & Last Will messages
- Topic clean-up (remove retained messages from the broker when disabling devices)
- Many BUG fixes
  
#### 2.0.6  
- Fixed a BUG in the Homie protocol regarding device state broadcasts  
  
#### 2.0.5  
- Topic fixes for system state dispatcher & command handler  
  
#### 2.0.4  
- Added instructions  
  
#### 2.0.3  
- Custom communication protocol
- Commands (rewrote some code to allow the command structure again)
- General bug fixes  
  
#### 2.0.2  
- Renamed the app to 'MQTT Hub'
- Implemented [Homie Convention v3.0.1](https://homieiot.github.io/)
- Implemented app settings page
- Optionally include `device class` & `zone` into the topic
- Full re-write of the app booting sequence
- Added Log stream
- Dropped support for Homey v1.5  
  
#### 2.0.1  
- Fixed messages for boolean capabilities  

#### 2.0.0  
- Initial release for Homey firmware v2 (beta)  
  
#### 1.0.2  
- Fixed getting device name
- Normalize device name  
  
#### 1.0.1
- Fixed messages for boolean capabilities  

#### 1.0.0
- Initial release for Homey firmware v1.5  