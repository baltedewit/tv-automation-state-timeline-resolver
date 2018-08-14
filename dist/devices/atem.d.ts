import { Device, DeviceOptions } from './device';
import { DeviceType } from './mapping';
import { TimelineState } from 'superfly-timeline';
import { State as DeviceState } from 'atem-state';
import { Conductor } from '../conductor';
/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export interface AtemDeviceOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: any) => Promise<any>;
    };
}
export interface AtemOptions {
    host: string;
    port?: number;
}
export declare enum TimelineContentTypeAtem {
    ME = "me",
    DSK = "dsk",
    AUX = "aux",
    SSRC = "ssrc",
    MEDIAPLAYER = "mp"
}
export declare class AtemDevice extends Device {
    private _doOnTime;
    private _device;
    private _state;
    private _initialized;
    private _connected;
    private _conductor;
    private _commandReceiver;
    constructor(deviceId: string, deviceOptions: AtemDeviceOptions, options: any, conductor: Conductor);
    /**
     * Initiates the connection with the ATEM through the atem-connection lib.
     */
    init(options: AtemOptions): Promise<boolean>;
    terminate(): Promise<boolean>;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly canConnect: boolean;
    readonly connected: boolean;
    convertStateToAtem(state: TimelineState): DeviceState;
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: {
        id: string;
        time: number;
    }[];
    private _addToQueue;
    private _diffStates;
    private _getDefaultState;
    private _defaultCommandReceiver;
}
