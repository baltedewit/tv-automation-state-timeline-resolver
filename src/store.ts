type State = { [key: string]: string | number | boolean }

export interface Subscription {
    key: string
    cb: (newValue: State[any], oldValue: State[any]) => void
    unsubscribe: () => Promise<void>
}

export interface IPCStoreMethods {
    setValue: Store['setValue']
    getValue: Store['getValue']
    watchValue: Store['watchValue']
}

export class Store {
    private readonly _state: State = {}
    private _subscribers = new Map<string, Array<Subscription>>()

    get state (): Readonly<State> {
        return this._state
    }

    setValue (key: string, value: State[any]) {
        console.log('set value ' + key + ' to ' + value)
        const oldValue = this._state[key]
        this._state[key] = value

        ;(this._subscribers.get(key) || []).forEach(s => s.cb(value, oldValue))
    }

    getValue (key: string) {
        console.log('get value ' + key)
        return this._state[key]
    }

    async watchValue (key: string, cb: Subscription['cb']): Promise<Subscription> {
        console.log('watch value ' + key)
        const subscription = {
            key,
            cb,
            unsubscribe: async () => {
                console.log('unsubscribe value ' + key)
                const subscriptions = this._subscribers.get(key)
                if (!subscriptions) return
                for (const i in subscriptions) {
                    if (subscriptions[i].cb === cb) {
                        delete subscriptions[i]
                    }
                }
            }
        }
        const subscriptions = this._subscribers.get(key) || this._subscribers.set(key, []).get(key)!

        subscriptions.push(subscription)

        return subscription
    }
}
