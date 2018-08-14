"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const device_1 = require("./device");
const casparcg_connection_1 = require("casparcg-connection");
const mapping_1 = require("./mapping");
const casparcg_state_1 = require("casparcg-state");
var TimelineContentTypeCasparCg;
(function (TimelineContentTypeCasparCg) {
    TimelineContentTypeCasparCg["VIDEO"] = "video";
    TimelineContentTypeCasparCg["AUDIO"] = "audio";
    TimelineContentTypeCasparCg["MEDIA"] = "media";
    TimelineContentTypeCasparCg["IP"] = "ip";
    TimelineContentTypeCasparCg["INPUT"] = "input";
    TimelineContentTypeCasparCg["TEMPLATE"] = "template";
    TimelineContentTypeCasparCg["HTMLPAGE"] = "htmlpage";
    TimelineContentTypeCasparCg["ROUTE"] = "route";
    TimelineContentTypeCasparCg["RECORD"] = "record";
})(TimelineContentTypeCasparCg = exports.TimelineContentTypeCasparCg || (exports.TimelineContentTypeCasparCg = {}));
class CasparCGDevice extends device_1.Device {
    constructor(deviceId, deviceOptions, options, conductor) {
        super(deviceId, deviceOptions, options);
        this._queue = {};
        if (deviceOptions.options) {
            if (deviceOptions.options.commandReceiver)
                this._commandReceiver = deviceOptions.options.commandReceiver;
            else
                this._commandReceiver = this._defaultCommandReceiver;
            // if (deviceOptions.options.timeBase) this._timeBase = deviceOptions.options.timeBase
        }
        this._ccgState = new casparcg_state_1.CasparCGState({
            currentTime: this.getCurrentTime,
            externalLog: (...args) => {
                this._log(...args);
            }
        });
        this._conductor = conductor;
    }
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init(connectionOptions) {
        this._ccg = new casparcg_connection_1.CasparCG({
            host: connectionOptions.host,
            port: connectionOptions.port,
            autoConnect: true,
            virginServerCheck: true,
            onConnectionChanged: (connected) => {
                this.emit('connectionChanged', connected);
            }
        });
        this._ccg.on(casparcg_connection_1.CasparCGSocketStatusEvent.CONNECTED, (event) => {
            this.makeReady(false) // always make sure timecode is correct, setting it can never do bad
                .catch((e) => this.emit('error', e));
            if (event.valueOf().virginServer === true) {
                // a "virgin server" was just restarted (so it is cleared & black).
                // Otherwise it was probably just a loss of connection
                this._ccgState.softClearState();
                this.clearStates();
                this._conductor.resetResolver(); // trigger a re-calc
            }
        });
        return new Promise((resolve, reject) => {
            this._ccg.info()
                .then((command) => {
                this._ccgState.initStateFromChannelInfo(_.map(command.response.data, (obj) => {
                    return {
                        channelNo: obj.channel,
                        videoMode: obj.format.toUpperCase(),
                        fps: obj.channelRate
                    };
                }));
                resolve(true);
            }).catch((e) => reject(e));
        }).then(() => {
            return true;
        });
    }
    terminate() {
        return new Promise((resolve) => {
            this._ccg.disconnect();
            this._ccg.onDisconnected = () => {
                resolve();
            };
        });
    }
    /**
     * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
     */
    handleState(newState) {
        // check if initialized:
        if (!this._ccgState.isInitialised) {
            this._log('CasparCG State not initialized yet');
            return;
        }
        console.log('handle', newState);
        let oldState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} };
        let newCasparState = this.convertStateToCaspar(newState);
        let oldCasparState = this.convertStateToCaspar(oldState);
        console.log('old', oldCasparState);
        console.log('new', newCasparState);
        let commandsToAchieveState = this._diffStates(oldCasparState, newCasparState);
        // clear any queued commands later than this time:
        let now = this.getCurrentTime();
        for (let token in this._queue) {
            if (this._queue[token] < now) {
                delete this._queue[token];
            }
            else if (this._queue[token] === newState.time) {
                this._doCommand(new casparcg_connection_1.AMCP.ScheduleRemoveCommand(token));
                delete this._queue[token];
            }
        }
        // console.log('commandsToAchieveState', commandsToAchieveState)
        // add the new commands to the queue:
        this._addToQueue(commandsToAchieveState, newState.time);
        // store the new state, for later use:
        this.setState(newState);
    }
    clearFuture(clearAfterTime) {
        // Clear any scheduled commands after this time
        for (let token in this._queue) {
            if (this._queue[token] > clearAfterTime) {
                this._doCommand(new casparcg_connection_1.AMCP.ScheduleRemoveCommand(token));
            }
        }
    }
    get canConnect() {
        return true;
    }
    get connected() {
        // Returns connection status
        return this._ccg.connected;
    }
    get deviceType() {
        return mapping_1.DeviceType.CASPARCG;
    }
    get deviceName() {
        return 'CasparCG ' + this._ccg.host + ':' + this._ccg.port;
    }
    get queue() {
        // if (this._queue) {
        // 	return _.map(this._queue, (val, index) => [ val, index ])
        // } else {
        // 	return []
        // }
        return this._doOnTime.getQueue();
    }
    /**
     * Takes a timeline state and returns a CasparCG State that will work with the state lib.
     * @param timelineState The timeline state to generate from.
     */
    convertStateToCaspar(timelineState) {
        const caspar = new casparcg_state_1.CasparCG.State();
        _.each(timelineState.LLayers, (layer, layerName) => {
            const layerExt = layer;
            let foundMapping = this.mapping[layerName];
            if (!foundMapping && layerExt.isBackground && layerExt.originalLLayer) {
                foundMapping = this.mapping[layerExt.originalLLayer];
            }
            if (foundMapping &&
                foundMapping.device === mapping_1.DeviceType.CASPARCG &&
                _.has(foundMapping, 'channel') &&
                _.has(foundMapping, 'layer')) {
                const mapping = {
                    device: mapping_1.DeviceType.CASPARCG,
                    deviceId: foundMapping.deviceId,
                    channel: foundMapping.channel || 0,
                    layer: foundMapping.layer || 0
                };
                const channel = caspar.channels[mapping.channel] ? caspar.channels[mapping.channel] : new casparcg_state_1.CasparCG.Channel();
                channel.channelNo = Number(mapping.channel) || 1;
                // @todo: check if we need to get fps.
                channel.fps = 50 / 1000; // 50 fps over 1000ms
                caspar.channels[channel.channelNo] = channel;
                let stateLayer = null;
                if (layer.content.type === TimelineContentTypeCasparCg.VIDEO || // to be deprecated & replaced by MEDIA
                    layer.content.type === TimelineContentTypeCasparCg.AUDIO || // to be deprecated & replaced by MEDIA
                    layer.content.type === TimelineContentTypeCasparCg.MEDIA) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.MEDIA,
                        media: layer.content.attributes.file,
                        playTime: layer.resolved.startTime || null,
                        pauseTime: layer.resolved.pauseTime || null,
                        playing: layer.resolved.playing !== undefined ? layer.resolved.playing : true,
                        looping: layer.content.attributes.loop,
                        seek: layer.content.attributes.seek
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.IP) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.MEDIA,
                        media: layer.content.attributes.uri,
                        playTime: null,
                        playing: true,
                        seek: 0 // ip inputs can't be seeked
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.INPUT) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.INPUT,
                        media: 'decklink',
                        input: {
                            device: layer.content.attributes.device
                        },
                        playing: true,
                        playTime: null
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.TEMPLATE) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.TEMPLATE,
                        media: layer.content.attributes.name,
                        playTime: layer.resolved.startTime || null,
                        playing: true,
                        templateType: layer.content.attributes.type || 'html',
                        templateData: layer.content.attributes.data,
                        cgStop: layer.content.attributes.useStopCommand
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.HTMLPAGE) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.HTMLPAGE,
                        media: layer.content.attributes.url,
                        playTime: layer.resolved.startTime || null,
                        playing: true
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.ROUTE) {
                    if (layer.content.attributes.LLayer) {
                        let routeMapping = this.mapping[layer.content.attributes.LLayer];
                        if (routeMapping) {
                            layer.content.attributes.channel = routeMapping.channel;
                            layer.content.attributes.layer = routeMapping.layer;
                        }
                    }
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.ROUTE,
                        media: 'route',
                        route: {
                            channel: layer.content.attributes.channel,
                            layer: layer.content.attributes.layer
                        },
                        mode: layer.content.attributes.mode || undefined,
                        playing: true,
                        playTime: null // layer.resolved.startTime || null
                    };
                    stateLayer = l;
                }
                else if (layer.content.type === TimelineContentTypeCasparCg.RECORD) {
                    if (layer.resolved.startTime) {
                        let l = {
                            layerNo: mapping.layer,
                            content: casparcg_state_1.CasparCG.LayerContentType.RECORD,
                            media: layer.content.attributes.file,
                            encoderOptions: layer.content.attributes.encoderOptions,
                            playing: true,
                            playTime: layer.resolved.startTime
                        };
                        stateLayer = l;
                    }
                }
                if (!stateLayer) {
                    let l = {
                        layerNo: mapping.layer,
                        content: casparcg_state_1.CasparCG.LayerContentType.NOTHING,
                        playing: false,
                        pauseTime: 0
                    };
                    stateLayer = l;
                }
                if (stateLayer) {
                    if (layer.content.transitions) {
                        switch (layer.content.type) {
                            case TimelineContentTypeCasparCg.VIDEO:
                            case TimelineContentTypeCasparCg.IP:
                            case TimelineContentTypeCasparCg.TEMPLATE:
                            case TimelineContentTypeCasparCg.INPUT:
                            case TimelineContentTypeCasparCg.ROUTE:
                                // create transition object
                                let media = stateLayer.media;
                                let transitions = {};
                                if (layer.content.transitions.inTransition) {
                                    transitions.inTransition = new casparcg_state_1.CasparCG.Transition(layer.content.transitions.inTransition.type, layer.content.transitions.inTransition.duration || layer.content.transitions.inTransition.maskFile, layer.content.transitions.inTransition.easing || layer.content.transitions.inTransition.delay, layer.content.transitions.inTransition.direction || layer.content.transitions.inTransition.overlayFile);
                                }
                                if (layer.content.transitions.outTransition) {
                                    transitions.outTransition = new casparcg_state_1.CasparCG.Transition(layer.content.transitions.outTransition.type, layer.content.transitions.outTransition.duration || layer.content.transitions.inTransition.maskFile, layer.content.transitions.outTransition.easing || layer.content.transitions.inTransition.delay, layer.content.transitions.outTransition.direction || layer.content.transitions.inTransition.overlayFile);
                                }
                                stateLayer.media = new casparcg_state_1.CasparCG.TransitionObject(media, {
                                    inTransition: transitions.inTransition,
                                    outTransition: transitions.outTransition
                                });
                                break;
                            default:
                                // create transition using mixer
                                break;
                        }
                    }
                    if (layer.resolved.mixer) {
                        // just pass through values here:
                        let mixer = {};
                        _.each(layer.resolved.mixer, (value, property) => {
                            mixer[property] = value;
                        });
                        stateLayer.mixer = mixer;
                    }
                    stateLayer.layerNo = mapping.layer;
                }
                if (stateLayer && !layerExt.isBackground) {
                    const prev = channel.layers[mapping.layer] || {};
                    channel.layers[mapping.layer] = _.extend(stateLayer, _.pick(prev, 'nextUp'));
                }
                else if (stateLayer && layerExt.isBackground) {
                    let s = stateLayer;
                    s.auto = false;
                    const res = channel.layers[mapping.layer];
                    if (!res) {
                        let l = {
                            layerNo: mapping.layer,
                            content: casparcg_state_1.CasparCG.LayerContentType.NOTHING,
                            playing: false,
                            pauseTime: 0,
                            nextUp: s
                        };
                        channel.layers[mapping.layer] = l;
                    }
                    else {
                        channel.layers[mapping.layer].nextUp = s;
                    }
                }
            }
        });
        return caspar;
    }
    makeReady(okToDestroyStuff) {
        // Sync Caspar Time to our time:
        return this._ccg.info()
            .then((command) => {
            let channels = command.response.data;
            // console.log('channels', channels)
            let p = Promise.resolve();
            // _.each(channels, (channel: any) => {
            // 	let channelNo = channel.channel
            // 	// let fps = channel.channelRate
            // 	let startTime
            // 	p = p.then(() => {
            // 		startTime = this.getCurrentTime()
            // 		return this._commandReceiver(startTime, new AMCP.CustomCommand({
            // 			command: (
            // 				'TIME ' + channelNo + ' ' + this.convertTimeToTimecode(startTime, channelNo)
            // 			)
            // 		}))
            // 	})
            // 	.then(() => {
            // 		let duration = this.getCurrentTime() - startTime
            // 		if (duration > 20) { // @todo: acceptable time is dependent on fps
            // 			throw Error('Caspar Time command took too long ("' + duration + '")')
            // 		}
            // 	})
            // })
            // Clear all channels (?)
            p = p.then(() => {
                if (okToDestroyStuff) {
                    return Promise.all(_.map(channels, (channel) => {
                        return this._commandReceiver(this.getCurrentTime(), new casparcg_connection_1.AMCP.ClearCommand({
                            channel: channel.channel
                        }));
                    })).then(() => { return; });
                }
                return Promise.resolve();
            });
            return p.then(() => { return; });
        })
            .then(() => {
            // reset our own state(s):
            this.clearStates();
            // a resolveTimeline will be triggered later
        });
    }
    _diffStates(oldState, newState) {
        let commands = this._ccgState.diffStates(oldState, newState);
        let returnCommands = [];
        _.each(commands, (cmdObject) => {
            returnCommands = returnCommands.concat(cmdObject.cmds);
        });
        return returnCommands;
    }
    _doCommand(command) {
        this._commandReceiver(this.getCurrentTime(), command)
            .catch(e => this.emit('error', e));
    }
    _addToQueue(commandsToAchieveState, time) {
        // _.each(commandsToAchieveState, (cmd: CommandNS.IAMCPCommandVO) => {
        // 			let command = AMCPUtil.deSerialize(loadbgCmd as CommandNS.IAMCPCommandVO, 'id')
        // 			let scheduleCommand = command
        // 			if (oldState.time >= this.getCurrentTime()) {
        // 				scheduleCommand = new AMCP.ScheduleSetCommand({
        // 					token: command.token,
        // 					timecode: this.convertTimeToTimecode(oldState.time, command.channel),
        // 					command
        // 				})
        // 			}
        // 			this._doCommand(scheduleCommand)
        // 			cmd._objectParams = {
        // 				channel: cmd.channel,
        // 				layer: cmd.layer,
        // 				noClear: cmd._objectParams.noClear
        // 			}
        // 		}
        // 	}
        // 	let command = AMCPUtil.deSerialize(cmd, 'id')
        // 	let scheduleCommand = new AMCP.ScheduleSetCommand({
        // 		token: command.token,
        // 		timecode: this.convertTimeToTimecode(time, command.channel),
        // 		command
        // 	})
        // 	if (time <= this.getCurrentTime()) {
        // 		this._doCommand(command)
        // 	} else {
        // 		this._doCommand(scheduleCommand)
        // 		this._queue[command.token] = time
        // 	}
        // })
        _.each(commandsToAchieveState, (cmd) => {
            // add the new commands to the queue:
            this._doOnTime.queue(time, (cmd) => {
                return this._commandReceiver(time, casparcg_connection_1.AMCPUtil.deSerialize(cmd, 'id'));
            }, cmd);
        });
    }
    _defaultCommandReceiver(time, cmd) {
        time = time;
        return this._ccg.do(cmd)
            .then((resCommand) => {
            if (this._queue[resCommand.token]) {
                delete this._queue[resCommand.token];
            }
        }).catch((error) => {
            this.emit('error', { cmdName: cmd.name, cmd, error });
            this._log(cmd, error);
            if (cmd.name === 'ScheduleSetCommand') {
                delete this._queue[cmd.getParam('command').token];
            }
        });
    }
}
exports.CasparCGDevice = CasparCGDevice;
//# sourceMappingURL=casparCG.js.map