'use strict';

const decimals = function (value, x, base) {
    var pow = Math.pow(base || 10, x);
    return Math.round(value * pow) / pow;
};

const formatValue = function (value, capability, percentageScale) {
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (capability && percentageScale && capability.units === '%') {
        switch (percentageScale) {
            case 'int':
                if (capability.min === 0 && capability.max === 1)
                    return value * 100;
                break;
            case 'float':
                if (capability.min === 0 && capability.max === 100)
                    return value / 100;
                break;
            case 'default':
            default:
                // nothing
                break;
        }
    }

    return value;
};

const parseValue = function (value, capability, percentageScale) {

    if (capability) {
        // Handle percentage scaling
        if (percentageScale && capability.units === '%') {
            switch (percentageScale) {
                case 'int':
                    if (capability.min === 0 && capability.max === 1)
                        return parseValue(value, 'integer') / 100.0;
                    break;
                case 'float':
                    if (capability.min === 0 && capability.max === 100)
                        return round(parseValue(value, 'float') * 100, 0, 100);
                    break;
                case 'default':
                default:
                    // nothing
                    break;
            }
        }

        // by data type
        switch (capability.type) {
            case 'boolean':
                if (typeof value === 'string') {
                    value = value.replace(/\'/gi,'').toLowerCase();
                }
                return value === true || value === 'true' || value === 1 || value === '1' || value === 'on' || value === 'yes';
            case 'number':
            case 'float':
                value = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) || 0 : 0;
                return capability.decimals >= 0 ? decimals(value, capability.decimals) : value;
            case 'integer':
                return typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) || 0 : 0;
            case 'string':
                return value ? value.toString() : undefined;
            case 'enum':
            case 'color':
            default:
                break;       
        }
    }

    switch (typeof value) {
        case 'boolean':
        case 'number':
            return value;
        default:
            let numeric = Number(value);
            return isNaN(numeric) ? value : numeric;
    }
};

const formatOnOff = function (value, onOffValues) {
    switch (onOffValues) {
        case 'bool': return value ? 'true' : 'false';
        case 'int': return value ? '1' : '0';
        case 'onoff': return value ? 'on' : 'off';
        case 'yesno': return value ? 'yes' : 'no';
    }
    return value;
};

module.exports = { decimals, formatValue, parseValue, formatOnOff };