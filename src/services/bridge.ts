// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => void;
type Listeners = Record<string, Callback[]>;

export class Bridge {
    private listeners: Listeners = {};

    private addListener(event: string | string[], fn: Callback) {
        const eventNames = typeof event === 'string' ? [event] : event;

        eventNames.forEach(name => {
            this.listeners[name] = this.listeners[name] || [];
            this.listeners[name].push(fn);
        });

        return this;
    }

    public $on(event: string | string[], fn: Callback) {
        return this.addListener(event, fn);
    }

    public $once(event: string | string[], fn: Callback) {
        const wrapper = (...args: unknown[]) => {
            fn(...args);

            this.$off(event, wrapper);
        };

        return this.addListener(event, wrapper);
    }

    public $off(event: string | string[], fn: Callback) {
        const eventNames = typeof event === 'string' ? [event] : event;

        eventNames.forEach(name => {
            const listeners = this.listeners[name];

            if(!listeners) return;

            this.listeners[name] = listeners.filter(listener => listener !== fn);
        });

        return this;
    }

    public $emit(name: string, ...args: unknown[]) {
        const callbacks = this.listeners[name] || [];

        callbacks.forEach(func => func(...args));
    }
}