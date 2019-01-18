# MQTT Gateway

With this app you can communicate with Homey using MQTT messages.  

## Functionality
- Dispatch device state changes for all connected devices.
- Dispatch system info (memory, cpu, etc.) on a regular basis.
- Request info (system, zone, device, capability, etc.).
- Update the state of a device (set capability).

## Communication
The gateway allows two ways of communication, by topic & by message.  
E.g. These two messages will both dim the tv light to 30%:
1. publish to topic 'homey/light/living/tv/dim/update', with message payload: 0.3
2. publish to topic 'homey/command', with message payload:
```javascript
{
  "command": "update",
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

#### MQTT Client
This app uses the [MQTT Client](https://apps.athom.com/app/nl.scanno.mqtt) (beta) to communicate with a MQTT broker.

#### MQTT Topic
The following message format is used for communication:  
`system name`/`device class`/`zone`/`device name`/`capability`/`command`

Note: `system name`, `zone` & `device name` will be normalized.  
E.g. Homey/light/Living room/Light tv/... -> homey/light/living_room/light_tv/...


#### Messages
Messages with the following commands are dispatched by the Gateway:
- `state`: Current state value. Dispatched on device state changes or on `request` command.
- `info`: JSON Object describing the element(s) in the request (Zone, Device, Capability, etc.).


#### Commands
The gateway provides the following commands to interact with Homey:
- `request`: Request current state, a `state` message will be published.
- `update`: Update a device state (capability).
- `describe`: Request a description of a Zone/Device/Capability/etc. Results will be published in a `info` message.


#### Device mapping
- Device id's will automatically be resolved from the device id, name or topic (in this order).
- The device name may contain either de original name or the normalized version.


## Homey firmware v1.5 and v2
Homey 2.0 users should use the beta version of this app.


## Future
- Create the abillity to listen to app flow triggers.
- Trigger flows.
- Settings page for managing the Gateway (on/off, select devices/capabilities, etc.).
- etc.


## Change Log

#### 1.0.2
- Fixed getting device name
- Normalize device name

#### 1.0.1
- Fixed messages for boolean capabilities

#### 1.0.0
- Initial release for Homey firmware v1.5