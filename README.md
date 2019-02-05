# MQTT Hub

Turn your Homey into a HUB and let external applications discover & control all your connected devices.
  
## Introduction
With this app you can communicate with your Homey devices using MQTT.  
The MQTT Hub automatically broadcasts all your devices and their capabilities. 
It will setup a communication channel for each device, so external apps can control each one of them.
Furthermore it provides an interface to read the full system state & and allows advanced control of your Homey, without the need to write your own app.
  
## What can it be used for?
Some of the many possibilities:
- Integrate with other home automation systems: [OpenHab](https://www.openhab.org/), [Home Assistant](https://www.home-assistant.io/), [Domiticz](http://www.domoticz.com/), etc.
- Create custom dashboards: [TileBoard](https://community.home-assistant.io/t/tileboard-new-dashboard-for-homeassistant/57173), [HABPanel](https://www.openhab.org/docs/configuration/habpanel.html), [Node RED Dashboard](https://flows.nodered.org/node/node-red-dashboard), etc.
- Create advanced flows and logic (using your desktop): [Node RED](https://nodered.org/), etc.
- Use native mobile apps (3rd party): [MQTT Dash](https://play.google.com/store/apps/details?id=net.routix.mqttdash), etc.
- ...
  
## Is this app for me?
This appp is **NOT** a plug & play solution. You need some technical background to get things working.
If you don't like to tinker with stuff, you don't like to try many different roads before you finally get your ultimate solution or you have no clue what a command-line is: it's probably not for you...
  
## MQTT?
[MQTT](http://mqtt.org/) is a lightweight communication protocol and it's (becoming) the industry standard for IoT messaging (Internet of Things).
Furthermore, the [Homie Convention](https://homieiot.github.io/) is implemented (v3.0.1).
From their website: *The Homie convention defines a standardized way of how IoT devices and services announce themselves and their data on the MQTT broker*.
  
## Functionality
- Dispatch device state changes for all connected devices.
- Dispatch system info (memory, cpu, etc.) on a regular basis.
- Request info (system, zone, device, capability, etc.).
- Update the state of any device (set capability).
- Configurable via app settings (e.g. topic structure, enable/disable devices, etc.)
  
## Installation
1. Install a MQTT broker of your liking (see below).
2. Install the MQTT Client (beta) app from the store and connect to your broker.
3. Install the MQTT Hub and let it discover & broadcast your devices.
4. Start communicating with homey.
  
TIP: [MQTT Explorer](https://thomasnordquist.github.io/MQTT-Explorer/) is a nice tool to check the available communication channels
  
## Communication
The default communication protocol is based on the Homie Convention standard, as explained above. Additional protocols (e.g. [HA Discovery](https://www.home-assistant.io/docs/mqtt/discovery/)) are in the pipeline.  
  
Additionally the MQTT Hub allows communication by message (payload).  
E.g. These two messages will both dim the tv light to 30%:
1. publish to topic 'homie/homey/tv/dim/set', with message payload: 0.3
2. publish to topic 'homie/homey/$command', with message payload:
  
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
     
#### MQTT Client & broker
This app uses the [MQTT Client](https://apps.athom.com/app/nl.scanno.mqtt) (**beta version** required) to communicate with a MQTT broker.
You can connect with any broker (e.g. [Mosquitto](https://mosquitto.org/) or [HiveMQ](https://www.hivemq.com/)). There is also a Homey [MQTT broker app](https://apps.athom.com/app/nl.scanno.mqttbroker) available for Homey.
  
#### MQTT Topic
The following message format is used for communication:  
`topic root`/`system name`/`device class (optional)`/`zone (optional)`/`device name`/`capability`/`$command`  
For further details see the [specification](https://homieiot.github.io/specification/) of the Homie Convention.
  
NOTE: `topic root`, `system name`, `zone` & `device name` will all be normalized.  
i.e. All special characters will be removed, spaces are replaced by a dash (-) and all remaining text will be converted to lowercase characters.   
E.g. `Homey/light/Living room/Light tv/...` will become `homey/light/living-room/light-tv/...`
  
#### Device mapping
- Device id's will automatically be resolved from the device id, name or topic (in this order).
- The device name may contain either de original name or the normalized version.
  
## Homey firmware v1.5 and v2
Starting from app version 2.0.2, this app can only run on Homey's v2 firmware. The reason for this is that this firmware has introduced backward incompatible changes that don't work on older versions of the firmware.
  
Some, features that will be introduced in this version will be backported to a separate `v1.5` [branch](https://github.com/harriedegroot/nl.hdg.mqtt/tree/homie). This branch can be manually installed on Homey using [`athom-cli`](https://www.npmjs.com/package/athom-cli).
    
## Future
- HA Discovery
- Additional installation info, tutorials & how-to's.
- Virtual buttons support
- Trigger flows.
- Create the abillity to listen to app flow triggers.
- ...
  
## Change Log
  
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

[pp-donate-link]: https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=harriedegroot%40gmail%2ecom&lc=NL&item_name=Harrie%20de%20Groot&item_number=Homey%20MQTT%20Hub&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted
[pp-donate-image]: https://img.shields.io/badge/Donate-PayPal-green.svg
