import { Device, DeviceOptions } from './device';
import { Command as CommandNS } from 'casparcg-connection';
import { DeviceType } from './mapping';
import { TimelineState } from 'superfly-timeline';
import { CasparCG as StateNS } from 'casparcg-state';
import { Conductor } from '../conductor';
export interface CasparCGDeviceOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: CommandNS.IAMCPCommand) => Promise<any>;
        timeBase?: {
            [channel: string]: number;
        } | number;
    };
}
export interface CasparCGOptions {
    host: string;
    port: number;
    syncTimecode?: boolean;
}
export declare enum TimelineContentTypeCasparCg {
    VIDEO = "video",
    AUDIO = "audio",
    MEDIA = "media",
    IP = "ip",
    INPUT = "input",
    TEMPLATE = "template",
    HTMLPAGE = "htmlpage",
    ROUTE = "route",
    RECORD = "record"
}
export declare class CasparCGDevice extends Device {
    private _ccg;
    private _conductor;
    private _ccgState;
    private _queue;
    private _commandReceiver;
    private _doOnTime;
    constructor(deviceId: string, deviceOptions: CasparCGDeviceOptions, options: any, conductor: Conductor);
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init(connectionOptions: CasparCGOptions): Promise<boolean>;
    terminate(): Promise<boolean>;
    /**
     * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
     */
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: {
        id: string;
        time: number;
    }[];
    /**
     * Takes a timeline state and returns a CasparCG State that will work with the state lib.
     * @param timelineState The timeline state to generate from.
     */
    convertStateToCaspar(timelineState: TimelineState): StateNS.State;
    makeReady(okToDestoryStuff?: boolean): Promise<void>;
    private _diffStates;
    private _doCommand;
    private _addToQueue;
    private _defaultCommandReceiver;
}
