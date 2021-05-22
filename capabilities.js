// NOTE: Capabilities defined in app.json
module.exports = {
    "measure_text": {
      "type": "string",
      "title": {
          "nl": "Waarde",
          "en": "Value"
      },
      "getable": true,
      "setable": false
    },
    "measure_numeric": {
      "type": "number",
      "title": {
          "nl": "Waarde",
          "en": "Value"
      },
      "getable": true,
      "setable": false,
      "icon": "/assets/icons/eye.svg"
    },
    "measure_binary": {
      "type": "boolean",
      "title": {
        "nl": "Waarde",
        "en": "Value"
      },
      "getable": true,
      "setable": false,
      "uiComponent": "toggle",
      "icon": "/assets/icons/check-circle-outline.svg"
    }
  }
