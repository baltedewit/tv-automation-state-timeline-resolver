"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const doOnTime_1 = require("../doOnTime");
const request = require("request");
var ReqestType;
(function (ReqestType) {
    ReqestType["POST"] = "post";
    ReqestType["PUT"] = "put";
    ReqestType["GET"] = "get";
})(ReqestType || (ReqestType = {}));
class HttpSendDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options) {
        super(deviceId, deviceOptions, options);
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
        }
        this._doOnTime = new doOnTime_1.DoOnTime(() => {
            return this.getCurrentTime();
        });
        this._doOnTime.on('error', e => this.emit('error', e));
    }
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init() {
        return new Promise((resolve /*, reject*/) => {
            // This is where we would do initialization, like connecting to the devices, etc
            // myDevide.onConnectionChange((connected: boolean) => {
            // this.emit('connectionChanged', connected)
            // })
            resolve(true);
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        // console.log('handleState')
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let oldAbstractState = this.convertStateToHttpSend(oldState);
        let newAbstractState = this.convertStateToHttpSend(newState);
        let commandsToAchieveState = this._diffStates(oldAbstractState, newAbstractState);
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
    get canConnect() {
        return false;
    }
    get connected() {
        return false;
    }
    convertStateToHttpSend(state) {
        // convert the timeline state into something we can use
        // (won't even use this.mapping)
        return state;
    }
    get deviceType() {
        return mapping_1.DeviceType.HTTPSEND;
    }
    get deviceName() {
        return 'HTTP-Send ' + this.deviceId;
    }
    get queue() {
        return this._doOnTime.getQueue();
    }
    _addToQueue(commandsToAchieveState, time) {
        _.each(commandsToAchieveState, (cmd) => {
            // add the new commands to the queue:
            this._doOnTime.queue(time, (cmd) => {
                if (cmd.commandName === 'added' ||
                    cmd.commandName === 'changed') {
                    return this._commandReceiver(time, cmd.content);
                }
                else {
                    return null;
                }
            }, cmd);
        });
    }
    _diffStates(oldhttpSendState, newhttpSendState) {
        // in this httpSend class, let's just cheat:
        let commands = [];
        _.each(newhttpSendState.LLayers, (newLayer, layerKey) => {
            let oldLayer = oldhttpSendState.LLayers[layerKey];
            if (!oldLayer) {
                // added!
                commands.push({
                    commandName: 'added',
                    content: newLayer.content
                });
            }
            else {
                // changed?
                if (!_.isEqual(oldLayer.content, newLayer.content)) {
                    // changed!
                    commands.push({
                        commandName: 'changed',
                        content: newLayer.content
                    });
                }
            }
        });
        // removed
        _.each(oldhttpSendState.LLayers, (oldLayer, layerKey) => {
            let newLayer = newhttpSendState.LLayers[layerKey];
            if (!newLayer) {
                // removed!
                commands.push({
                    commandName: 'removed',
                    content: oldLayer.content
                });
            }
        });
        return commands;
    }
    _defaultCommandReceiver(time, cmd) {
        time = time;
        this.emit('info', 'HTTP: Send ', cmd);
        if (cmd.type === ReqestType.POST) {
            return new Promise((resolve, reject) => {
                request.post(cmd.url, // 'http://www.yoursite.com/formpage',
                { json: cmd.params }, (error, response) => {
                    if (error) {
                        this.emit('error', 'Error in httpSend POST: ' + error);
                        reject(error);
                    }
                    else if (response.statusCode === 200) {
                        // console.log('200 Response from ' + cmd.url, body)
                        resolve();
                    }
                    else {
                        // console.log(response.statusCode + ' Response from ' + cmd.url, body)
                        resolve();
                    }
                });
            });
        }
        else if (cmd.type === ReqestType.PUT) {
            return new Promise((resolve, reject) => {
                request.put(cmd.url, // 'http://www.yoursite.com/formpage',
                { json: cmd.params }, (error, response) => {
                    if (error) {
                        this.emit('error', 'Error in httpSend PUT: ' + error);
                        reject(error);
                    }
                    else if (response.statusCode === 200) {
                        // console.log('200 Response from ' + cmd.url, body)
                        resolve();
                    }
                    else {
                        // console.log(response.statusCode + ' Response from ' + cmd.url, body)
                        resolve();
                    }
                });
            });
        }
        else if (cmd.type === ReqestType.GET) {
            // console.log('Sending POST request to ',
            // 	cmd.url,
            // 	cmd.params
            // )
            return new Promise((resolve, reject) => {
                request.get(cmd.url, // 'http://www.yoursite.com/formpage',
                { json: cmd.params }, (error, response) => {
                    if (error) {
                        this.emit('error', 'Error in httpSend GET: ' + error);
                        reject(error);
                    }
                    else if (response.statusCode === 200) {
                        // console.log('200 Response from ' + cmd.url, body)
                        resolve();
                    }
                    else {
                        // console.log(response.statusCode + ' Response from ' + cmd.url, body)
                        resolve();
                    }
                });
            });
        }
        else {
            return Promise.reject('Unknown HTTP-send type: "' + cmd.type + '"');
        }
    }
}
exports.HttpSendDevice = HttpSendDevice;
//# sourceMappingURL=httpSend.js.map