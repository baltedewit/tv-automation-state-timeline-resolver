import { Device, DeviceOptions } from './device';
import { DeviceType } from './mapping';
import { TimelineState } from 'superfly-timeline';
export interface AbstractDeviceOptions extends DeviceOptions {
    options?: {
        commandReceiver?: (time: number, cmd: any) => Promise<any>;
    };
}
export declare type Command = any;
export declare class AbstractDevice extends Device {
    private _doOnTime;
    private _commandReceiver;
    constructor(deviceId: string, deviceOptions: AbstractDeviceOptions, options: any);
    /**
     * Initiates the connection with CasparCG through the ccg-connection lib.
     */
    init(): Promise<boolean>;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly connected: boolean;
    convertStateToAbstract(state: TimelineState): TimelineState;
    readonly deviceType: DeviceType;
    readonly deviceName: string;
    readonly queue: {
        id: string;
        time: number;
    }[];
    private _addToQueue;
    private _diffStates;
    private _defaultCommandReceiver;
}
