# MQTT Hub

Turn your Homey into a HUB and let external applications discover & control all your connected devices.
  
## Introduction
With this app you can communicate with all your devices connected to Homey using MQTT.  
The MQTT Hub automatically broadcasts all your devices and capabilities. 
It will setup mqtt communication channels for external apps to discover and control the Homey devices.
Auto discovery protocols are implemented to simplify the setup and connection with external apps. 
Finally this app includes an `MQTT Device`, which can be used to add Virtual Devices with mappings between Homey capabilities and mqtt topics. 
  
## Functionality
The functionality of the MQTT Hub:
- Broadcast all available Homey devices and capabilities.
- Create communication channels for each device.
- Continously dispatch device state changes for all connected devices.
- Auto discovery of your Homey devices for external apps.
- Auto discovery of external devices using the Homie convention.
- Add the ability to remotely update the state of any device.
- Dispatch system info (memory, cpu, etc.) on a regular interval.
- Add Virtual MQTT Devices with mappings between Homey capabilities and mqtt topics.
  
All can be configured via extensive app settings and connection wizards.
  
## What can it be used for?
Some of the many possibilities:
- Integrate with other home automation systems: [OpenHab](https://www.openhab.org/), [Home Assistant](https://www.home-assistant.io/), [Domoticz](http://www.domoticz.com/), ...
- Create custom dashboards: [Lovelace UI](https://www.home-assistant.io/lovelace/), [TileBoard](https://community.home-assistant.io/t/tileboard-new-dashboard-for-homeassistant/57173), [HABPanel](https://www.openhab.org/docs/configuration/habpanel.html), [Node RED Dashboard](https://flows.nodered.org/node/node-red-dashboard), ...
- Create advanced flows and logic: [Node RED](https://nodered.org/), ...
- Use native mobile apps (3rd party): [MQTT Dash](https://play.google.com/store/apps/details?id=net.routix.mqttdash), ...
- Connect to virtual assistants (Google Home/Assistant): [gBridge](https://gBridge.io), ...
- Control external devices over MQTT by adding a virtual Homie Device
- ...
  
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
  
## MQTT Device
An MQTT Device driver is available to control external MQTT devices from within Homey. This device can be added via the 'add Device' wizard. Select a custom device class and add functionality by adding capabilities mapped to MQTT topics. Incoming messages can be manipulated by adding a value template. Values can be grabbed from a JSON formatted message by using JSONPath or calculated using a mathJS expression. Outgoing messages can also be formatted using an output template. If JSON output is required, JSON-T style formatting is implemented. mathJS calculations are also allowed for outgoing data.  

## Communication
The hub allows several ways of communication.  
The default communication protocol is based on the [Homie Convention](https://homieiot.github.io/) (v3.0.1), for details see the [specification](https://homieiot.github.io/specification/).  
From their website: *The Homie convention defines a standardized way of how IoT devices and services announce themselves and their data on the MQTT broker*.
  
#### Auto discovery
External apps can automatically discover your devices connected to Homey by auto discovery. The Homie Convention supports this by design. Additionally [HA Discovery](https://www.home-assistant.io/docs/mqtt/discovery/) is implemented.  
  
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
     
When using the command structure:
- Device id's will automatically be resolved from the device id, name or topic (in this order).
- The device name may contain either de original name or the normalized version.  
  
#### Birth & Last Will  
The MQTT Hub is able to broadcast a `birth` message on startup and a `last will` message on shutdown. This can be used by external applications to act on the Hub availability (`online`/`offline`).
  


## Change Log  
Can be found here: [CHANGE_LOG.md](/CHANGE_LOG.md).
  
## Final note ##
The repository is available at: https://github.com/harriedegroot/nl.hdg.mqtt  
If you want to contribute, just create a [pull-request](https://help.github.com/articles/about-pull-requests/) and I will take a look at it!

Do you like this app? Consider a donation to support development.
 
[![Donate][pp-donate-image]][pp-donate-link]

[pp-donate-link]: https://www.paypal.me/harriedegroot
[pp-donate-image]: https://img.shields.io/badge/Donate-PayPal-green.svg
