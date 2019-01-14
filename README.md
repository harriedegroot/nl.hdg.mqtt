# MQTT Gateway for Athom Homey

Provides a MQTT gateway to your Homey.  
This app uses the MQTT Client to send & receive MQTT messages.

## Functionality
- Dispatch Device state changes for all devices.
- Dispatch system info (memory, cpu, etc.) on a regular basis.
- Request info (system, zone, device, capability, etc.).
- Update the state of a device (set capability).

MQTT topic format: *homey*/`device class`/`zone`/`device name`/`capability`/`command`

Note: `zone` & `device name` will be normalized.  
E.g. Living room/Light tv -> living_room/light_tv

#### Messages
Messages with the following commands are dispatched by Homey:
- `state`: Current state value. Dispatched on device state changes or on `request` command.
- `info`: JSON Object describing the element(s) in the request (Zone, Device, Capability, etc.).

#### Commands
The gateway provides the following commands to interact with Homey:
- `request`: Request current state, a `state` message will be published.
- `update`: Update a device state (capability).
- `describe`: Request a description of a Zone/Device/Capability/etc. Results will be published in a `info` message.

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
#### Device mapping
- Device id's will automatically be resolved from the device id, name or topic (in this order).
- The device name may contain either de original name or the normalized version.

## Future
Whishes:
- Create the abillity to listen to app flow triggers.
- Trigger flows.
- Settings page for managing the Gateway (on/off, select devices/capabilities, etc.).
- etc.