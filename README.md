# MQTT Hub

Turn your Homey into a HUB and let external applications discover & control all your connected devices.
  
## Introduction
With this app you can communicate with all your devices connected to Homey using MQTT.  
The MQTT Hub automatically broadcasts all your devices and their capabilities. 
It will setup a communication channel per device, so external apps can find and control each one of them.
Furthermore it provides an interface to read the full system state & and allows advanced control of your Homey, without the need to write your own app.  
Auto discovery protocols are implemented to simplify the setup and connection with external apps.
  
## What can it be used for?
Some of the many possibilities:
- Integrate with other home automation systems: [OpenHab](https://www.openhab.org/), [Home Assistant](https://www.home-assistant.io/), [Domoticz](http://www.domoticz.com/), ...
- Create custom dashboards: [Lovelace UI](https://www.home-assistant.io/lovelace/), [TileBoard](https://community.home-assistant.io/t/tileboard-new-dashboard-for-homeassistant/57173), [HABPanel](https://www.openhab.org/docs/configuration/habpanel.html), [Node RED Dashboard](https://flows.nodered.org/node/node-red-dashboard), ...
- Create advanced flows and logic: [Node RED](https://nodered.org/), ...
- Use native mobile apps (3rd party): [MQTT Dash](https://play.google.com/store/apps/details?id=net.routix.mqttdash), ...
- Connect to virtual assistants (Google Home/Assistant): [gBridge](https://gBridge.io), ...
- Control external devices over MQTT by adding a virtual Homie Device
- ...
  
## Functionality
The functionality of the MQTT Hub:
- Broadcast all available devices.
- Create a communication channel for each device.
- Dispatch device state changes for all connected devices.
- Auto discovery of your Homey devices within external apps.
- Add the ability to remotely update the state of any device.
- Dispatch system info (memory, cpu, etc.) on a regular basis.
- Add Virtual MQTT Devices
  
All can be configured via app settings.
  
## Is this app for me?
*First*: This appp is NOT a plug & play solution. NOR is it the replacement for the desktop interface.  
*Second*: You need some technical background to get things working. So, if you don't like to tinker with stuff, you don't like to try many different roads before you finally get your ultimate solution or you don't like to dive just a little deeper to get things up and running: it's probably not for you...

If this meets your expectations and none of the above applies to you: Have fun!  
  
## MQTT?
[MQTT](http://mqtt.org/) is a lightweight communication protocol on top of TCP/IP and it's (becoming) the industry standard for IoT messaging (Internet of Things).
The [Homie Convention](https://homieiot.github.io/) (v3.0.1) is implemented to streamline the communication with external platforms by applying a communication standard.
 
#### MQTT client & broker
This app uses the [MQTT Client app](https://apps.athom.com/app/nl.scanno.mqtt) to communicate with a MQTT broker.
You can connect with any broker (e.g. [CloudMQTT](https://www.cloudmqtt.com/), [Mosquitto](https://mosquitto.org/) or [HiveMQ](https://www.hivemq.com/)). There is also a [MQTT broker app](https://apps.athom.com/app/nl.scanno.mqttbroker) available for Homey.
  
## Installation
1. Install an MQTT broker of your liking.
2. Install the MQTT Client app from the store and connect to your broker.
3. Install the MQTT Hub and let it discover & broadcast your devices.
4. Install any external application supporting MQTT and connect it to your broker.
5. Let your app discover Homeys devices (if it supports the Homie Convention). 
6. Configure your communication channels by observing & dispatching messages on the available topics.
7. Start communicating with homey.
  
TIP: [MQTT Explorer](https://mqtt-explorer.com/) is a nice tool to check the available communication channels.
  
## Communication
The hub allows several ways of communication.  
The default communication protocol is based on the [Homie Convention](https://homieiot.github.io/) (v3.0.1), for details see the [specification](https://homieiot.github.io/specification/).  
From their website: *The Homie convention defines a standardized way of how IoT devices and services announce themselves and their data on the MQTT broker*.
  
#### Auto discovery
External apps can automatically discover your devices connected to Homey by auto discovery.
The Homie Convention supports this by design. Additionally [HA Discovery](https://www.home-assistant.io/docs/mqtt/discovery/) is implemented.  
  
#### MQTT Topic
The following message format is used for communication:  
`root`/`system name`/`device class (optional)`/`zone (optional)`/`device name`/`capability`/`command`  
  
NOTE: `root`, `system name`, `zone` & `device name` will all be normalized.  
i.e. All special characters will be removed, spaces are replaced by a dash (-) and all remaining text will be converted to lowercase characters.   
E.g. `Homey/light/Living room/Light tv/...` will become `homey/light/living-room/light-tv/...`
  
#### Customize
The MQTT Hub also allows a `custom` communication protocol with the ability to configure:
- topic structure (e.g. inject device class and/or zone)
- color format (HSV, RGB, channels)
- enable/disable dispatching of device states
- disable topic normalization
- dimensions & value scaling  
  
#### Commands
The hub provides two ways of controlling your devices over MQTT.  
The first one is provided by the selected communication protocol.  
Additionally the hub allows communication by message (payload). To command your Homey, you can send a payload to the topic `<homey devicd id>/$command`.  
  
E.g. These two messages will both dim the tv light to 30%:
1. publish to topic 'homie/homey/tv/dim/set', with message payload: 0.3
2. publish to topic 'homey/$command', with message payload:
  
```javascript
{
  "command": "set",
  "device":{
    "name": "tv"
    "class": "light", // optional
    "zone": "living", // optional
    "id": "<your-device-guid>" // optional
  },
  "capability": "dim"
  "value": 0.3
}
```  
     
When using the command structure:
- Device id's will automatically be resolved from the device id, name or topic (in this order).
- The device name may contain either de original name or the normalized version.  
  
  
#### Birth & Last Will  
The MQTT Hub is able to broadcast a `birth` message on startup and a `last will` message on shutdown.
This can be used by external applications to act on the Hub availability (online/offline).
  
#### MQTT Device
An MQTT Device is available to control external MQTT devices from within Homey. This device can be added via the 'add Device' wizard.
Select a custom device class and add functionality by adding capabilities mapped to MQTT topics.
    
## Homey firmware v1.5 and v2
Starting from app version 2.0.0, this app can only run on Homey's v2 firmware. The reason for this is that this firmware has introduced backward incompatible changes that don't work on older versions of the firmware.
  
The `v1.5` [branch](https://github.com/harriedegroot/nl.hdg.mqtt/tree/version1.5) will remain and can be manually installed on Homey using [`athom-cli`](https://www.npmjs.com/package/athom-cli).
    
## Future
- Trigger flows
- Create the abillity to listen to app flow triggers
- Discover devices from external apps
- Expand the insights / device state broadcaster
- Additional commands for advanced control
- ...
  
## Change Log  
  
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
  
## Final note ##
The repository is available at: https://github.com/harriedegroot/nl.hdg.mqtt  
If you want to contribute, just create a [pull-request](https://help.github.com/articles/about-pull-requests/) and I will take a look at it!

Do you like this app? Consider a donation to support development.
 
[![Donate][pp-donate-image]][pp-donate-link]

[pp-donate-link]: https://www.paypal.me/harriedegroot
[pp-donate-image]: https://img.shields.io/badge/Donate-PayPal-green.svg
