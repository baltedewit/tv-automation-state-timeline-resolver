"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const emberplus_1 = require("emberplus");
const doOnTime_1 = require("../doOnTime");
var TimelineContentTypeLawo;
(function (TimelineContentTypeLawo) {
    TimelineContentTypeLawo["SOURCE"] = "lawosource"; // a general content type, possibly to be replaced by specific ones later?
})(TimelineContentTypeLawo = exports.TimelineContentTypeLawo || (exports.TimelineContentTypeLawo = {}));
class LawoDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        this._savedNodes = [];
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver) {
                this._commandReceiver = deviceOptions.options.commandReceiver;
            }
            else {
                this._commandReceiver = this._defaultCommandReceiver;
            }
            if (deviceOptions.options.sourcesPath) {
                this._sourcesPath = deviceOptions.options.sourcesPath;
            }
            if (deviceOptions.options.rampMotorFunctionPath) {
                this._rampMotorFunctionPath = deviceOptions.options.rampMotorFunctionPath;
            }
        }
        let host = (deviceOptions.options && deviceOptions.options.host
            ? deviceOptions.options.host :
            null);
        let port = (deviceOptions.options && deviceOptions.options.port ?
            deviceOptions.options.port :
            null);
        this._doOnTime = new doOnTime_1.DoOnTime(() => {
            return this.getCurrentTime();
        });
        this._doOnTime.on('error', e => this.emit('error', e));
        this._device = new emberplus_1.DeviceTree(host, port);
        this._device.on('error', (e) => {
            if ((e.message + '').match(/econnrefused/i) ||
                (e.message + '').match(/disconnected/i)) {
                this.emit('connectionChanged', false);
            }
            else {
                this.emit('error', e);
            }
        });
        this._device.on('connected', () => {
            this.emit('connectionChanged', true);
        });
    }
    /**
     * Initiates the connection with Lawo
     */
    init() {
        return new Promise((resolve, reject) => {
            let fail = (e) => reject(e);
            try {
                this._device.once('error', fail);
                this._device.connect() // default timeout = 2
                    .then(() => {
                    this._device.removeListener('error', fail);
                    resolve(true);
                })
                    .catch((e) => {
                    this._device.removeListener('error', fail);
                    reject(e);
                });
            }
            catch (e) {
                this._device.removeListener('error', fail);
                reject(e);
            }
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let oldLawoState = this.convertStateToLawo(oldState);
        let newLawoState = this.convertStateToLawo(newState);
        let commandsToAchieveState = this._diffStates(oldLawoState, newLawoState);
        // clear any queued commands later than this time:
        this._doOnTime.clearQueueAfter(newState.time);
        // add the new commands to the queue:
        this._addToQueue(commandsToAchieveState, newState.time);
        // store the new state, for later use:
        this.setState(newState);
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        this._doOnTime.clearQueueAfter(clearAfterTime);
    }
    get connected() {
        return false;
    }
    convertStateToLawo(state) {
        // convert the timeline state into something we can use
        const lawoState = {};
        _.each(state.LLayers, (tlObject, layerName) => {
            const mapping = this.mapping[layerName];
            if (mapping && mapping.identifier && mapping.device === mapping_1.DeviceType.LAWO) {
                if (tlObject.content.type === TimelineContentTypeLawo.SOURCE) {
                    let tlObjectSource = tlObject;
                    _.each(tlObjectSource.content.attributes, (value, key) => {
                        lawoState[this._sourceNodeAttributePath(mapping.identifier, key)] = {
                            type: tlObjectSource.content.type,
                            key: key,
                            identifier: mapping.identifier,
                            value: value.value,
                            transitionDuration: value.transitionDuration,
                            triggerValue: value.triggerValue
                        };
                    });
                }
            }
        });
        return lawoState;
    }
    get deviceType() {
        return mapping_1.DeviceType.LAWO;
    }
    get deviceName() {
        return 'Lawo ' + this.deviceId;
    }
    get queue() {
        return this._doOnTime.getQueue();
    }
    set mapping(mappings) {
        super.mapping = mappings;
    }
    get mapping() {
        return super.mapping;
    }
    _addToQueue(commandsToAchieveState, time) {
        _.each(commandsToAchieveState, (cmd) => {
            // add the new commands to the queue:
            this._doOnTime.queue(time, (cmd) => {
                return this._commandReceiver(time, cmd);
            }, cmd);
        });
    }
    _diffStates(oldLawoState, newLawoState) {
        let commands = [];
        let addCommand = (path, newNode) => {
            // It's a plain value:
            commands.push({
                path: path,
                type: newNode.type,
                key: newNode.key,
                identifier: newNode.identifier,
                value: newNode.value,
                transitionDuration: newNode.transitionDuration
            });
        };
        _.each(newLawoState, (newNode, path) => {
            let oldValue = oldLawoState[path] || null;
            if (!_.isEqual(newNode, oldValue)) {
                addCommand(path, newNode);
            }
        });
        return commands;
    }
    _getNodeByPath(path) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (this._savedNodes[path] !== undefined) {
                    resolve(this._savedNodes[path]);
                }
                else {
                    this._device.getNodeByPath(path)
                        .then((node) => {
                        this._savedNodes[path] = node;
                        resolve(node);
                    })
                        .catch((e) => {
                        this.emit('error', `Path error: ${e.toString()}`);
                        reject(e);
                    });
                }
            });
        });
    }
    _sourceNodeAttributePath(identifier, attributePath) {
        return _.compact([
            this._sourcesPath,
            identifier,
            attributePath.replace('/', '.')
        ]).join('.');
    }
    // @ts-ignore no-unused-vars
    _defaultCommandReceiver(time, command) {
        if (command.key === 'Fader/Motor dB Value') { // fader level
            if (command.transitionDuration && command.transitionDuration > 0) { // with timed fader movement
                return this._device.invokeFunction(new emberplus_1.Ember.QualifiedFunction(this._rampMotorFunctionPath), [command.identifier, new emberplus_1.Ember.ParameterContents(command.value, 'real'), new emberplus_1.Ember.ParameterContents(command.transitionDuration / 1000, 'real')])
                    .then((res) => this.emit('info', `Ember function result: ${JSON.stringify(res)}`))
                    .catch((e) => {
                    this.emit('error', `Ember function command error: ${e.toString()}`);
                });
            }
            else { // withouth timed fader movement
                return this._getNodeByPath(command.path)
                    .then((node) => {
                    this._device.setValue(node, new emberplus_1.Ember.ParameterContents(command.value, 'real'))
                        .then((res) => this.emit('info', `Ember result: ${JSON.stringify(res)}`))
                        .catch((e) => console.log(e));
                })
                    .catch((e) => {
                    this.emit('error', `Ember command error: ${e.toString()}`);
                });
            }
        }
    }
}
exports.LawoDevice = LawoDevice;
//# sourceMappingURL=lawo.js.map