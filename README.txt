With this app you can communicate with all your devices connected to Homey using MQTT.

The MQTT Hub automatically broadcasts all your devices and capabilities. It will setup mqtt communication channels for external apps to discover and control the Homey devices.
Auto discovery protocols are implemented to simplify the setup and connection with external apps. 
This app also includes an MQTT Device, which can be used to add Virtual Devices with mappings between Homey capabilities and mqtt topics. 
  
All functionality of the MQTT Hub:
- Broadcast all available Homey devices and capabilities.
- Create communication channels for each device.
- Continously dispatch device state changes for all connected devices.
- Auto discovery of your Homey devices for external apps.
- Auto discovery of external devices using the Homie convention.
- Add the ability to remotely update the state of any device.
- Dispatch system info (memory, cpu, etc.) on a regular interval.
- Add Virtual MQTT Devices with mappings between Homey capabilities and mqtt topics.

All can be configured via extensive app settings and connection wizards.