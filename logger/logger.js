class Logger {
    constructor(options) {
        this.options = options;
    }

    variable(message) {
        if (this.options.boldVariable) {
            message = this.bold(message);
        }
        return this.colorize(33, message);
    }

    timestamp() {
        const now = new Date();
        const hh = now.getHours();
        const ii = now.getMinutes();
        const ss = now.getSeconds();
        const dd = now.getDate();
        const mm = now.getMonth() + 1;
        const yyyy = now.getFullYear();

        return `${yyyy}-${mm.toString().padStart(2,'0')}-${dd.toString().padStart(2,'0')} ${hh.toString().padStart(2,'0')}:${ii.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`
    }

    info(message) {
        this.write(this.colorize(34, this.bold(this.options.namespace)), message);
    }

    error(message) {
        this.write(this.colorize(31, this.bold(this.options.namespace)), message);
    }

    warning(message) {
        this.write(this.colorize(33, this.bold(this.options.namespace)), message);
    }

    write(title, message) {
        if (this.options.timestamp) {
            console.log(title, this.colorize(35, this.timestamp()), message);
        } else {
            console.log(title, message);
        }
    }

    bold(text) {
        return this.colorize(1, text);
    }

    colorize(code, text) {
        if (this.options.monochrome) {
            return `${text}`;
        }
        return `\x1b[${code}m${text}\x1b[0m`;
    }
}

function logger(opts) {
    const defaultOptions = {
        namespace: 'logger',
        boldVariable: false,
        timestamp: false
    };
    const options = Object.assign(defaultOptions, opts);

    return new Logger(options);
}

module.exports = logger;