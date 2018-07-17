"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const events_1 = require("events");
class Device extends events_1.EventEmitter {
    constructor(deviceId, deviceOptions, options) {
        super();
        this._states = {};
        this._setStateCount = 0;
        this._deviceId = deviceId;
        this._deviceOptions = deviceOptions;
        this._deviceOptions = this._deviceOptions; // ts-lint fix
        if (options.getCurrentTime) {
            this._getCurrentTime = options.getCurrentTime;
        }
        if (options.externalLog) {
            this._log = options.externalLog;
        }
        else {
            this._log = () => { return; };
        }
    }
    init(connectionOptions) {
        // connect to the device, resolve the promise when ready.
        connectionOptions = connectionOptions; // ts-ignore
        throw new Error('This class method must be replaced by the Device class!');
        // return Promise.resolve(true)
    }
    terminate() {
        return Promise.resolve(true);
    }
    getCurrentTime() {
        if (this._getCurrentTime)
            return this._getCurrentTime();
        return Date.now();
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        newState = newState;
        throw new Error('This class method must be replaced by the Device class!');
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        clearAfterTime = clearAfterTime;
        throw new Error('This class method must be replaced by the Device class!');
    }
    get connected() {
        // Returns connection status
        throw new Error('This class method must be replaced by the Device class!');
    }
    getStateBefore(time) {
        let foundTime = 0;
        let foundState = null;
        _.each(this._states, (state, stateTimeStr) => {
            let stateTime = parseFloat(stateTimeStr);
            if (stateTime > foundTime && stateTime < time) {
                foundState = state;
                foundTime = stateTime;
            }
        });
        return foundState;
    }
    setState(state) {
        this._states[state.time + ''] = state;
        this.cleanUpStates(0, state.time); // remove states after this time, as they are not relevant anymore
        this._setStateCount++;
        if (this._setStateCount > 10) {
            this._setStateCount = 0;
            // Clean up old states:
            let stateBeforeNow = this.getStateBefore(this._getCurrentTime());
            if (stateBeforeNow && stateBeforeNow.time) {
                this.cleanUpStates(stateBeforeNow.time - 1, 0);
            }
        }
    }
    cleanUpStates(removeBeforeTime, removeAfterTime) {
        _.each(_.keys(this._states), (stateTimeStr) => {
            let stateTime = parseFloat(stateTimeStr);
            if ((removeBeforeTime &&
                stateTime < removeBeforeTime) ||
                (removeAfterTime &&
                    stateTime > removeAfterTime) ||
                !stateTime) {
                delete this._states[stateTime];
            }
        });
    }
    clearStates() {
        _.each(_.keys(this._states), (time) => {
            delete this._states[time];
        });
    }
    /**
     * The makeReady method could be triggered at a time before broadcast
     * Whenever we know that the user want's to make sure things are ready for broadcast
     * The exact implementation differ between different devices
     * @param okToDestoryStuff If true, the device may do things that might affect the output (temporarily)
     */
    makeReady(okToDestoryStuff) {
        // This method should be overwritten by child
        okToDestoryStuff = okToDestoryStuff;
        return Promise.resolve();
    }
    /**
     * The standDown event could be triggered at a time after broadcast
     * The exact implementation differ between different devices
     * @param okToDestoryStuff If true, the device may do things that might affect the output (temporarily)
     */
    standDown(okToDestoryStuff) {
        // This method should be overwritten by child
        okToDestoryStuff = okToDestoryStuff;
        return Promise.resolve();
    }
    get mapping() {
        return this._mappings;
    }
    set mapping(mappings) {
        this._mappings = mappings;
    }
    get deviceId() {
        return this._deviceId;
    }
    get deviceName() {
        // Return a human-readable name for this device
        throw new Error('This class method must be replaced by the Device class!');
    }
    set deviceId(deviceId) {
        this._deviceId = deviceId;
    }
    get deviceType() {
        // return DeviceType.ABSTRACT
        throw new Error('This class method must be replaced by the Device class!');
    }
    get deviceOptions() {
        return this._deviceOptions;
    }
}
exports.Device = Device;
//# sourceMappingURL=device.js.map