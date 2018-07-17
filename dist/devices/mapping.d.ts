export interface Mappings {
    [layerName: string]: Mapping;
}
export interface Mapping {
    device: DeviceType;
    deviceId: string;
    channel?: number;
    layer?: number;
}
export interface MappingCasparCG extends Mapping {
    device: DeviceType.CASPARCG;
    channel: number;
    layer: number;
}
export interface MappingAbstract extends Mapping {
    device: DeviceType.ABSTRACT;
    abstractPipe: number;
}
export interface MappingAtem extends Mapping {
    device: DeviceType.ATEM;
    mappingType: MappingAtemType;
    index?: number;
}
export interface MappingHTTPSend extends Mapping {
    device: DeviceType.HTTPSEND;
}
export interface MappingLawo extends Mapping {
    device: DeviceType.LAWO;
    mappingType: MappingLawoType;
    identifier: string;
}
export declare enum MappingAtemType {
    MixEffect = 0,
    DownStreamKeyer = 1,
    SuperSourceBox = 2,
    Auxilliary = 3,
    MediaPlayer = 4
}
export declare enum MappingLawoType {
    SOURCE = "source"
}
export declare enum DeviceType {
    ABSTRACT = 0,
    CASPARCG = 1,
    ATEM = 2,
    LAWO = 3,
    HTTPSEND = 4
}
