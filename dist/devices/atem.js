"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const underScoreDeepExtend = require("underscore-deep-extend");
const device_1 = require("./device");
const mapping_1 = require("./mapping");
const atem_connection_1 = require("atem-connection");
const atem_state_1 = require("atem-state");
const doOnTime_1 = require("../doOnTime");
_.mixin({ deepExtend: underScoreDeepExtend(_) });
function deepExtend(destination, ...sources) {
    // @ts-ignore (mixin)
    return _.deepExtend(destination, ...sources);
}
var TimelineContentTypeAtem;
(function (TimelineContentTypeAtem) {
    TimelineContentTypeAtem["ME"] = "me";
    TimelineContentTypeAtem["DSK"] = "dsk";
    TimelineContentTypeAtem["AUX"] = "aux";
    TimelineContentTypeAtem["SSRC"] = "ssrc";
    TimelineContentTypeAtem["MEDIAPLAYER"] = "mp";
})(TimelineContentTypeAtem = exports.TimelineContentTypeAtem || (exports.TimelineContentTypeAtem = {}));
class AtemDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options, conductor) {
        super(deviceId, deviceOptions, options);
        this._initialized = false;
        this._connected = false; // note: ideally this should be replaced by this._device.connected
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
        this._conductor = conductor;
    }
    /**
     * Initiates the connection with the ATEM through the atem-connection lib.
     */
    init(options) {
        return new Promise((resolve /*, reject*/) => {
            // This is where we would do initialization, like connecting to the devices, etc
            this._state = new atem_state_1.AtemState();
            this._device = new atem_connection_1.Atem();
            this._device.connect(options.host, options.port);
            this._device.once('connected', () => {
                // console.log('-------------- ATEM CONNECTED')
                // this.emit('connectionChanged', true)
                // check if state has been initialized:
                this._connected = true;
                this._initialized = true;
                resolve(true);
            });
            this._device.on('connected', () => {
                this.setState(this._device.state, this.getCurrentTime());
                this._connected = true;
                this.emit('connectionChanged', true);
                this._conductor.resetResolver();
            });
            this._device.on('disconnected', () => {
                this._connected = false;
                this.emit('connectionChanged', false);
            });
            this._device.on('error', (e) => this.emit('error', e));
        });
    }
    terminate() {
        return new Promise((resolve) => {
            // TODO: implement dispose function in atem-connection
            // this._device.dispose()
            // .then(() => {
            // resolve(true)
            // })
            resolve(true);
        });
    }
    handleState(newState) {
        // Handle this new state, at the point in time specified
        // @ts-ignore
        // console.log('handleState', JSON.stringify(newState, ' ', 2))
        // console.log('handleState', newState.LLayers['myLayer0'])
        if (!this._initialized) {
            // before it's initialized don't do anything
            this._log('Atem not initialized yet');
            return;
        }
        let oldState = this.getStateBefore(newState.time) || this._getDefaultState();
        let oldAtemState = oldState;
        let newAtemState = this.convertStateToAtem(newState);
        // @ts-ignore
        // console.log('newAtemState', JSON.stringify(newAtemState, ' ', 2))
        // console.log('oldAtemState', JSON.stringify(oldAtemState, ' ', 2))
        // console.log('newAtemState', newAtemState.video.ME[0])
        let commandsToAchieveState = this._diffStates(oldAtemState, newAtemState);
        // console.log('commandsToAchieveState', commandsToAchieveState)
        // clear any queued commands later than this time:
        this._doOnTime.clearQueueAfter(newState.time);
        // add the new commands to the queue:
        this._addToQueue(commandsToAchieveState, newState.time);
        // store the new state, for later use:
        this.setState(newAtemState, newState.time);
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        this._doOnTime.clearQueueAfter(clearAfterTime);
        // Clear any scheduled commands after this time
        // this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
    }
    get canConnect() {
        return true;
    }
    get connected() {
        return this._connected;
    }
    convertStateToAtem(state) {
        if (!this._initialized)
            throw Error('convertStateToAtem cannot be used before inititialized');
        // Convert the timeline state into something we can use easier:
        const deviceState = this._getDefaultState();
        const sortedLayers = _.map(state.LLayers, (tlObject, layerName) => ({ layerName, tlObject }))
            .sort((a, b) => a.layerName.localeCompare(b.layerName));
        _.each(sortedLayers, ({ tlObject, layerName }) => {
            const tlObjectExt = tlObject;
            const content = tlObject.resolved || tlObject.content;
            let mapping = this.mapping[layerName];
            if (!mapping && tlObjectExt.originalLLayer) {
                mapping = this.mapping[tlObjectExt.originalLLayer];
            }
            if (mapping) {
                if (mapping.index !== undefined && mapping.index >= 0) { // index must be 0 or higher
                    // 	obj = {}
                    // 	obj[mapping.index] = tlObject.content
                    // }
                    switch (mapping.mappingType) {
                        case mapping_1.MappingAtemType.MixEffect:
                            if (tlObjectExt.isBackground) {
                                break;
                            }
                            if (content.type === TimelineContentTypeAtem.ME) {
                                let me = deviceState.video.ME[mapping.index];
                                if (me)
                                    deepExtend(me, content.attributes);
                            }
                            break;
                        case mapping_1.MappingAtemType.DownStreamKeyer:
                            if (tlObjectExt.isBackground) {
                                break;
                            }
                            if (content.type === TimelineContentTypeAtem.DSK) {
                                let dsk = deviceState.video.downstreamKeyers[mapping.index];
                                if (dsk)
                                    deepExtend(dsk, content.attributes);
                            }
                            break;
                        case mapping_1.MappingAtemType.SuperSourceBox:
                            if (tlObjectExt.isBackground && (!tlObjectExt.originalLLayer || tlObjectExt.originalLLayer && state.LLayers[tlObjectExt.originalLLayer])) {
                                break;
                            }
                            if (content.type === TimelineContentTypeAtem.SSRC) {
                                let ssrc = deviceState.video.superSourceBoxes;
                                if (ssrc)
                                    deepExtend(ssrc, content.attributes.boxes);
                            }
                            break;
                        case mapping_1.MappingAtemType.Auxilliary:
                            if (tlObjectExt.isBackground) {
                                break;
                            }
                            if (content.type === TimelineContentTypeAtem.AUX) {
                                deviceState.video.auxilliaries[mapping.index] = content.attributes.input;
                            }
                            break;
                        case mapping_1.MappingAtemType.MediaPlayer:
                            if (tlObjectExt.isBackground) {
                                break;
                            }
                            if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
                                let ms = deviceState.media.players[mapping.index];
                                if (ms)
                                    deepExtend(ms, content.attributes);
                            }
                            break;
                    }
                }
            }
        });
        return deviceState;
    }
    get deviceType() {
        return mapping_1.DeviceType.ATEM;
    }
    get deviceName() {
        return 'Atem ' + this.deviceId;
    }
    get queue() {
        return this._doOnTime.getQueue();
    }
    _addToQueue(commandsToAchieveState, time) {
        _.each(commandsToAchieveState, (cmd) => {
            // add the new commands to the queue:
            this._doOnTime.queue(time, (cmd) => {
                return this._commandReceiver(time, cmd);
            }, cmd);
        });
    }
    _diffStates(oldAbstractState, newAbstractState) {
        let commands = this._state.diffStates(oldAbstractState, newAbstractState);
        return commands;
    }
    _getDefaultState() {
        let deviceState = new atem_state_1.State();
        for (let i = 0; i < this._device.state.info.capabilities.MEs; i++) {
            deviceState.video.ME[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.MixEffect));
            for (const usk in this._device.state.video.ME[i].upstreamKeyers) {
                deviceState.video.ME[i].upstreamKeyers[usk] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.UpstreamKeyer(Number(usk))));
                for (const flyKf in this._device.state.video.ME[i].upstreamKeyers[usk].flyKeyframes) {
                    deviceState.video.ME[i].upstreamKeyers[usk].flyKeyframes[flyKf] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.flyKeyframe(Number(flyKf))));
                }
            }
        }
        for (let i = 0; i < Object.keys(this._device.state.video.downstreamKeyers).length; i++) {
            deviceState.video.downstreamKeyers[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.DownStreamKeyer));
        }
        for (let i = 0; i < this._device.state.info.capabilities.auxilliaries; i++) {
            deviceState.video.auxilliaries[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.defaultInput));
        }
        for (let i = 0; i < this._device.state.info.superSourceBoxes; i++) {
            deviceState.video.superSourceBoxes[i] = JSON.parse(JSON.stringify(atem_state_1.Defaults.Video.SuperSourceBox));
        }
        return deviceState;
    }
    _defaultCommandReceiver(time, command) {
        time = time; // seriously this needs to stop
        return this._device.sendCommand(command).then(() => {
            // @todo: command was acknowledged by atem, how will we check if it did what we wanted?
        });
    }
}
exports.AtemDevice = AtemDevice;
//# sourceMappingURL=atem.js.map