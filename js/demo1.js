/**
 * Single oscillator demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import { stepFreq } from './music.js'

;($ => {

    $(document).ready(() => {
        const Ctx = new AudioContext()

        // Main volume.
        const Main = Ctx.createGain()
        Main.connect(Ctx.destination)

        // Delay with gain control.
        const Delay = Ctx.createDelay()
        // Delay feedback
        Delay.feedback = Ctx.createGain()
        Delay.connect(Delay.feedback)
        Delay.feedback.connect(Delay)

        // Oscillator.
        const Oscillator = Ctx.createOscillator()
        Oscillator.dry = Ctx.createGain()
        Oscillator.dry.connect(Main)
        Oscillator.connect(Oscillator.dry)

        // FX Chain
        Oscillator.connect(Delay)
        Delay.connect(Main)

        // Compressor
        const Compressor = Ctx.createDynamicsCompressor()
        Object.defineProperty(Compressor, 'active', {
            get: function() {
                return Boolean(this._active)
            },
            set: function(value) {
                value = Boolean(value)
                if (value === this.active) {
                    return
                }
                this._active = value
                // Fixed position in chain, after Delay, before Main.
                const prev = Delay
                const next = Main
                if (value) {
                    // Insert into chain.
                    prev.disconnect(next)
                    prev.connect(this)
                    this.connect(next)
                } else {
                    // Remove from chain.
                    this.disconnect(next)
                    prev.disconnect(this)
                    prev.connect(next)
                }
            },
        })

        // Setter elements to parameter.
        const ParamValueSetters = {
            'volume': Main.gain,
            'oscillator-dry': Oscillator.dry.gain,
            'oscillator-frequency': Oscillator.frequency,
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
                    Oscillator[id]()
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
                    let param = Oscillator.frequency
                    param.value = stepFreq(param.value, value) || param.value
                    break
                case 'waveform':
                    Oscillator.type = data.value
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
            Compressor.active = $('#compressor-active').prop('checked')
        }

        // Initial state.
        Oscillator.type = 'sine'
        Oscillator.frequency.value = stepFreq(440)
        $('#stop').prop('disabled', true)
        readParams()
        updateMeters()
    })

})(window.jQuery);