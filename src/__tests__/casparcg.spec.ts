import { CasparCG, AMCP } from 'casparcg-connection'
// import {Resolver, Enums} from "superfly-timeline"
import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingCasparCG, MappingAbstract, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'

let nowActual: number = Date.now()
let now: number = 1000

beforeAll(() => {
	Date.now = jest.fn()
	Date.now['mockReturnValue'](1000)
})
function getCurrentTime () {
	return now
}

function advanceTime (advanceTime: number) {
	now += advanceTime
	jest.advanceTimersByTime(advanceTime)
	// console.log('Advancing ' + advanceTime + ' ms -----------------------')
}

test('CasparCG: Play AMB for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 5600

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'video',
				attributes: {
					file: 'AMB',
					loop: true
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		clip: 'AMB',
		loop: true,
		seek: 0 // looping and seeking at the same time is not supported.
	})

	// advance time to end of clip:
	advanceTime(1500) // 7200

	// two commands have been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[1][1].name).toEqual('ScheduleSetCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('ClearCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.channel).toEqual(2)
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.layer).toEqual(42)
})

test('CasparCG: Play IP input for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'ip',
				attributes: {
					uri: 'rtsp://127.0.0.1:5004'
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		clip: 'rtsp://127.0.0.1:5004',
		seek: 0 // can't seek in an ip input
	})

	// advance time to end of clip:
	advanceTime(1500) // 7200

	// two commands have been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[1][1].name).toEqual('ScheduleSetCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('ClearCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.channel).toEqual(2)
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.layer).toEqual(42)
})

test('CasparCG: Play decklink input for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'input',
				attributes: {
					device: 1
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		device: 1
	})

	// advance time to end of clip:
	advanceTime(1500) // 7200

	// two commands have been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[1][1].name).toEqual('ScheduleSetCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('ClearCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command._objectParams).toMatchObject({ channel: 2, layer: 42 })
})

test('CasparCG: Play template for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'template',
				attributes: {
					name: 'LT',
					data: {
						f0: 'Hello',
						f1: 'World'
					},
					useStopCommand: true
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1].name).toEqual('CGAddCommand')
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		templateName: 'LT',
		flashLayer: 1,
		playOnLoad: true,
		data: { f0: 'Hello', f1: 'World' },
		cgStop: true,
		templateType: 'html'
	})

	expect(commandReceiver0.mock.calls[1][1].name).toEqual('ScheduleSetCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('CGStopCommand')
})

test('CasparCG: Play template for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'record',
				attributes: {
					file: 'RECORDING',
					encoderOptions: '-format mkv -c:v libx264 -crf 22'
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1].name).toEqual('CustomCommand')
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		media: 'RECORDING',
		encoderOptions: '-format mkv -c:v libx264 -crf 22',
		command: 'ADD 2 FILE RECORDING -format mkv -c:v libx264 -crf 22',
		customCommand: 'add file'
	})

	expect(commandReceiver0.mock.calls[1][1].name).toEqual('ScheduleSetCommand')
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('CustomCommand')
})

test('CasparCG: Play 2 routes for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping1: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 1,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0,
		'myLayer1': myLayerMapping1
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	let device = myConductor.getDevice('myCCG')

	// Check that no commands has been scheduled:
	expect(device['queue']).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 3000,
			LLayer: 'myLayer0',
			content: {
				type: 'route',
				attributes: {
					LLayer: 'myLayer1'
				}
			}
		},
		{
			id: 'obj1',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1000 // 1 seconds into the future
			},
			duration: 1000,
			LLayer: 'myLayer1',
			content: {
				type: 'route',
				attributes: {
					channel: 2,
					layer: 23
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(4)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		routeChannel: 1,
		routeLayer: 42,
		command: 'PLAY 2-42 route://1-42',
		customCommand: 'route'
	})

	advanceTime(1000) // 6700

	// expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command._objectParams).toMatchObject({
		channel: 1,
		layer: 42,
		noClear: false,
		routeChannel: 2,
		routeLayer: 23,
		command: 'PLAY 1-42 route://2-23',
		customCommand: 'route'
	})

	// advance time to end of clip:
	advanceTime(1500) // 7200

	// two more commands have been sent:
	// expect(commandReceiver0).toHaveBeenCalledTimes(4)
	// expect 2 clear commands:
	expect(commandReceiver0.mock.calls[2][1]._objectParams.command.name).toEqual('ClearCommand')
	expect(commandReceiver0.mock.calls[3][1]._objectParams.command.name).toEqual('ClearCommand')
})

test('CasparCG: AMB with transitions', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	// Check that no commands has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB'
				},
				transitions: {
					inTransition: {
						type: 'MIX',
						duration: 1000,
						easing: 'linear',
						direction: 'left'
					},
					outTransition: {
						type: 'MIX',
						duration: 1000,
						easing: 'linear',
						direction: 'right'
					}
				}
			}
		}
	]

	// fast-forward:
	advanceTime(100) // 7400
	console.log(commandReceiver0.mock.calls[1][1])
	// console.log(commandReceiver0.mock.calls[2][1])
	// Check that an ACMP-command has been sent
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		transition: 'MIX',
		transitionDuration: 50,
		transitionEasing: 'linear',
		transitionDirection: 'left',
		clip: 'AMB',
		seek: 50,
		loop: false
	})

	expect(commandReceiver0.mock.calls[0][1]._objectParams.command._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		transition: 'MIX',
		transitionDuration: 50,
		transitionEasing: 'linear',
		transitionDirection: 'right',
		clip: 'empty'
	})

	// Nothing more should've happened:
	advanceTime(4000) // 10400

	expect(commandReceiver0.mock.calls.length).toBe(2)
})

test ('CasparCG: Mixer commands', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	// Check that no commands has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 12000, // 12s
			LLayer: 'myLayer0',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true
				},
				keyframes: [{
					id: 'kf1',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE, // Absolute time, relative time or logical
						value: 500 // 0 = parent's start
					},
					duration: 5500,
					content: { mixer: {
						perspective: {
							topLeftX: 0,
							topLeftY: 0,
							topRightX: 0.5,
							topRightY: 0,
							bottomRightX: 0.5,
							bottomRightY: 1,
							bottomLeftX: 0,
							bottomLeftY: 1
						}
					}}

				},{
					id: 'kf2',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE, // Absolute time, relative time or logical
						value: 6000 // 0 = parent's start
					},
					duration: 6000,
					content: { mixer: {
						perspective: {
							topLeftX: 0,
							topLeftY: 0,
							topRightX: 1,
							topRightY: 0,
							bottomRightX: 1,
							bottomRightY: 1,
							bottomLeftX: 0,
							bottomLeftY: 1
						}
					}}

				}]
			}
		}
	]

	// fast-forward:
	advanceTime(500)

	// Check that ACMP-commands has been sent
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	// we've already tested play commands so let's check the mixer command:
	expect(commandReceiver0.mock.calls[1][1].name).toMatch(/MixerPerspectiveCommand/)
	expect(commandReceiver0.mock.calls[1][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		topLeftX: 0,
		topLeftY: 0,
		topRightX: 0.5,
		topRightY: 0,
		bottomRightX: 0.5,
		bottomRightY: 1,
		bottomLeftX: 0,
		bottomLeftY: 1,
		keyword: 'PERSPECTIVE'
	})

	// fast-forward:
	advanceTime(5000)

	expect(commandReceiver0.mock.calls.length).toBe(4)
	// expect(CasparCG.mockDo.mock.calls[2][0]).toBeInstanceOf(AMCP.StopCommand);
	expect(commandReceiver0.mock.calls[2][1]._objectParams.command.name).toMatch(/MixerPerspectiveCommand/)
	expect(commandReceiver0.mock.calls[2][1]._objectParams.command._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		topLeftX: 0,
		topLeftY: 0,
		topRightX: 1,
		topRightY: 0,
		bottomRightX: 1,
		bottomRightY: 1,
		bottomLeftX: 0,
		bottomLeftY: 1,
		keyword: 'PERSPECTIVE'
	})

})

test('CasparCG: loadbg command', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1100 // 1 second in the future
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				type: 'video',
				attributes: {
					file: 'AMB',
					loop: true
				}
			}
		}
	]

	advanceTime(100)
	console.log(commandReceiver0.mock.calls[0][1]._objectParams.command)
	expect(commandReceiver0.mock.calls[0][1].name).toEqual('LoadbgCommand')
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		clip: 'AMB',
		seek: 0,
		loop: true
	})
	advanceTime(2000)
	expect(commandReceiver0.mock.calls[1][1]._objectParams.command.name).toEqual('PlayCommand')

})
