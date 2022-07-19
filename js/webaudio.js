/**
 * Single oscillator demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
;($ => {

    $(document).ready(() => {
        const Ctx = new AudioContext()

        // Main volume.
        const Main = Ctx.createGain()
        Main.connect(Ctx.destination)

        // Delay with gain control.
        const Delay = Ctx.createDelay()
        Delay.connect(Main)
        // Delay feedback
        Delay.feedback = Ctx.createGain()
        Delay.connect(Delay.feedback)
        Delay.feedback.connect(Delay)

        // Oscillator.
        const Osc = Ctx.createOscillator()
        Osc.dry = Ctx.createGain()
        Osc.dry.gain.value = 1
        Osc.dry.connect(Main)
        Osc.connect(Osc.dry)
        Osc.connect(Delay)

        // Compressor
        const Compressor = Ctx.createDynamicsCompressor()
        Compressor._active = false
        Compressor.prev = Delay
        Compressor.next = Main
        Object.defineProperty(Compressor, 'active', {
            get: getActive,
            set: setActive,
        })

        // Setter elements to parameter.
        const ParamValueSetters = {
            'volume': Main.gain,
            'oscillator-dry': Osc.dry.gain,
            'oscillator-frequency': Osc.frequency,
            'delay-time': Delay.delayTime,
            'delay-feedback': Delay.feedback.gain,
            'compressor-threshold': Compressor.threshold,
            'compressor-knee': Compressor.knee,
            'compressor-ratio': Compressor.ratio,
            'compressor-attack': Compressor.attack,
            'compressor-release': Compressor.release,
        }


        $(document).on('click', function(e) {
            const $target = $(e.target)
            const id = $target.attr('id')
            switch (id) {
                case 'start':
                    $('#stop').prop('disabled', false)
                case 'stop':
                    Osc[id]()
                    $target.prop('disabled', true)
                    return
            }
            const data = $target.data()
            const {name, value} = data
            if (!name) {
                return
            }
            switch (name) {
                case 'interval':
                    let param = Osc.frequency
                    param.value = stepFreq(param.value, value) || param.value
                    break
                case 'waveform':
                    Osc.type = data.value
                    break
            }
            updateMeters()
        })

        $(document).on('change', function(e) {
            const $target = $(e.target)
            const id = $target.attr('id')
            switch (id) {
                case 'compressor-active':
                    Compressor.active = $target.prop('checked')
                    return
            }
            const value = $target.val()
            let param = ParamValueSetters[id]
            if (param) {
                param.value = value
            }
            updateMeters()
        })

        function setActive(value) {
            value = Boolean(value)
            if (value === this.active) {
                return
            }
            if (value) {
                this.prev.disconnect(this.next)
                this.prev.connect(this)
                this.connect(this.next)
            } else {
                this.disconnect(this.next)
                this.prev.disconnect(this)
                this.prev.connect(this.next)
            }
            this._active = value
        }
        function getActive() {
            return Boolean(this._active)
        }
        /**
         * Update meter text values.
         */
        function updateMeters() {
            Object.entries(ParamValueSetters).forEach(([id, param]) => {
                const {value} = param
                if (value !== undefined) {
                    $(`#${id}-meter`).text(value.toFixed(2))
                }
            })
        }

        /**
         * Read param setters from elements.
         */
        function readParams() {
            Object.entries(ParamValueSetters).forEach(([id, param]) => {
                const value = $(`#${id}`).val()
                if (value) {
                    param.value = value
                }
            })
        }

        // Initial state.
        Osc.type = 'sine'
        Osc.frequency.value = stepFreq(440)
        $('#stop').prop('disabled', true)
        readParams()
        updateMeters()
    })

    /**
     * Adjust a frequency by a number of half-steps. Performs internal
     * floor rounding to get a valid value.
     * 
     * @param {float} value
     * @param {integer} halfSteps
     * @return {float}
     */
    function stepFreq(value, halfSteps = 0) {
        return FREQS[FREQI[Math.floor(Number(value))] + Number(halfSteps)]
    }

    const OCTAVES = [
        [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87],
        [32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74],
        [65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47],
        [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94],
        [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88],
        [523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77],
        [1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53],
        [2093.00, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520.00, 3729.31, 3951.07],
        [4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040.00, 7458.62, 7902.13],
    ]
    const FREQS = []
    OCTAVES.forEach(octave => octave.forEach(freq => FREQS.push(freq)))
    const FREQI = Object.create(null)
    FREQS.forEach((freq, i) => FREQI[Math.floor(freq)] = i)

})(window.jQuery);