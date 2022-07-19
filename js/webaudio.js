/**
 * Single oscillator demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 * 
 */
;($ => {

    $(document).ready(() => {
        const Ctx = new AudioContext()

        // Main volume.
        const Main = Ctx.createGain()
        Main.connect(Ctx.destination)

        // Single oscillator.
        const Osc = Ctx.createOscillator()
        // Oscillator dry signal.
        Osc.connect(Main)

        // Delay with gain control.
        const Delay = Ctx.createDelay()
        Delay.level = Ctx.createGain()
        Delay.connect(Delay.level)
        // Delay feedback
        Delay.feedback = Ctx.createGain()
        Delay.connect(Delay.feedback)
        Delay.feedback.connect(Delay)

        // Oscillator -> delay.
        Osc.connect(Delay)
        Delay.level.connect(Main)

        $(document).on('click', function(e) {
            const $target = $(e.target)
            const data = $target.data()
            const {category} = data
            if (category) switch (category) {
                case 'start':
                    Osc.start()
                    $target.prop('disabled', true)
                    $('#stop').prop('disabled', false)
                    break
                case 'stop':
                    Osc.stop()
                    $target.prop('disabled', true)
                    break
                case 'frequency':
                    let freq = Osc.frequency
                    freq.value = stepFreq(freq.value, data.quantity) || freq.value
                    updateMeters()
                    break
                case 'waveform':
                    Osc.type = data.value
                    break
            }
        })

        $(document).on('change', function(e) {
            const $target = $(e.target)
            const data = $target.data()
            const {category} = data
            if (!category) {
                return
            }
            const value = $target.val()
            switch (category) {
                case 'volume':
                    Main.gain.value = Number(value)
                    break
                case 'delay-gain':
                    Delay.level.gain.value = Number(value)
                    break
                case 'delay-time':
                    Delay.delayTime.value = Number(value)
                    break
                case 'delay-feedback':
                    Delay.feedback.gain.value = Number(value)
                    break
            }
            updateMeters()
        })

        // Meter elements to parameter.
        const Meters = {
            '#volume-meter': Main.gain,
            '#frequency-meter': Osc.frequency,
            '#delay-gain-meter': Delay.level.gain,
            '#delay-time-meter': Delay.delayTime,
            '#delay-feedback-meter': Delay.feedback.gain,
        }

        /**
         * Update meter text values.
         */
        function updateMeters() {
            Object.entries(Meters).forEach(([sel, param]) => {
                $(sel).text(param.value.toFixed(2))
            })
        }

        // Initial state.
        Osc.type = 'sine'
        Osc.frequency.value = stepFreq(440)
        Delay.level.gain.value = Number($('#delay-gain').val())
        Delay.delayTime.value = Number($('#delay-time').val())
        Delay.feedback.gain.value = Number($('#delay-feedback').val())
        Main.gain.value = Number($('#volume').val())
        $('#stop').prop('disabled', true)
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

    const FREQS = [
        /*
        // C0
        16.35, 17.32, 18.35, 19.45, 20.60, 21.83,
        23.12, 24.50, 25.96, 27.50, 29.14, 30.87,
        // C1
        32.70, 34.65, 36.71, 38.89, 41.20, 43.65,
        46.25, 49.00, 51.91, 55.00, 58.27, 61.74,
        */
        // C2
        65.41, 69.30, 73.42, 77.78, 82.41, 87.31,
        92.50, 98.00, 103.83, 110.00, 116.54, 123.47,
        // C3
        130.81, 138.59, 146.83, 155.56, 164.81, 174.61,
        185.00, 196.00, 207.65, 220.00, 233.08, 246.94,
        // C4
        261.63, 277.18, 293.66, 311.13, 329.63, 349.23,
        369.99, 392.00, 415.30, 440.00, 466.16, 493.88,
        // C5
        523.25, 554.37, 587.33, 622.25, 659.25, 698.46,
        739.99, 783.99, 830.61, 880.00, 932.33, 987.77,
        // C6
        1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91,
        1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53,
        // C7
        2093.00, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83,
        2959.96, 3135.96, 3322.44, 3520.00, 3729.31, 3951.07,
        // C8
        4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65,
        5919.91, 6271.93, 6644.88, 7040.00, 7458.62, 7902.13,
    ]
    const FREQI = Object.create(null)
    FREQS.forEach((freq, i) => FREQI[Math.floor(freq)] = i)

})(window.jQuery);