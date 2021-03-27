## Change Log  

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