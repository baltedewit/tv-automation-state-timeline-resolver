/// <reference types="node" />
import { TimelineState } from 'superfly-timeline';
import { Mappings, DeviceType } from './mapping';
import { EventEmitter } from 'events';
export interface DeviceCommand {
    time: number;
    deviceId: string;
    command: any;
}
export interface DeviceCommandContainer {
    deviceId: string;
    commands: Array<DeviceCommand>;
}
export interface DeviceOptions {
    type: DeviceType;
    options?: {};
    externalLog?: (...args: any[]) => void;
}
export declare class Device extends EventEmitter {
    protected _log: (...args: any[]) => void;
    private _getCurrentTime;
    private _deviceId;
    private _deviceOptions;
    private _states;
    private _mappings;
    private _setStateCount;
    constructor(deviceId: string, deviceOptions: DeviceOptions, options: any);
    init(connectionOptions: any): Promise<boolean>;
    terminate(): Promise<boolean>;
    getCurrentTime(): number;
    handleState(newState: TimelineState): void;
    clearFuture(clearAfterTime: number): void;
    readonly canConnect: boolean;
    readonly connected: boolean;
    getStateBefore(time: number): TimelineState | null;
    setState(state: any, time?: any): void;
    cleanUpStates(removeBeforeTime: any, removeAfterTime: any): void;
    clearStates(): void;
    /**
     * The makeReady method could be triggered at a time before broadcast
     * Whenever we know that the user want's to make sure things are ready for broadcast
     * The exact implementation differ between different devices
     * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
     */
    makeReady(okToDestroyStuff?: boolean): Promise<void>;
    /**
     * The standDown event could be triggered at a time after broadcast
     * The exact implementation differ between different devices
     * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
     */
    standDown(okToDestroyStuff?: boolean): Promise<void>;
    mapping: Mappings;
    deviceId: string;
    readonly deviceName: string;
    readonly deviceType: DeviceType;
    readonly deviceOptions: DeviceOptions;
}
