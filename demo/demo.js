/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../src/jquery.js'
import * as Music from '../src/music.js'
import * as Effects from '../src/effects.js'
import * as Widgets from '../src/widgets.js'

$(() => {

    $('#oscillator-type').controlgroup()
    $(document).on({click, change})

    const Context = new AudioContext()
    
    const Main = new GainNode(Context)
    const Dry = new GainNode(Context)
    const FxSend = new GainNode(Context)

    const Oscillator = new OscillatorNode(Context, {frequency: 440})

    Oscillator.connect(Dry)
    Oscillator.connect(FxSend)
    Dry.connect(Main)
    Main.connect(Context.destination)

    const effects = {
        distortion: new Effects.Distortion(Context),
        overdrive: new Effects.Overdrive(Context),
        delay: new Effects.Delay(Context),
        lowpass: new Effects.Lowpass(Context),
        highpass: new Effects.Highpass(Context),
        compressor: new Effects.Compressor(Context),
    }

    Effects.initChain(FxSend, Main, Object.values(effects))
    
    // Element IDs to effects node.
    const Activators = {}

    // Element IDs to parameter.
    const Params = {
        'volume': Main.gain,
        'oscillator-dry': Dry.gain,
        'oscillator-fxsend': FxSend.gain,
        'oscillator-frequency': Oscillator.frequency,
    }

    ;(() => {

        // Populate Activators and Params, and create widgets.
        const $effects = $('#effects')
        Object.entries(effects).forEach(([id, node]) => {
            const {params, name} = node.meta
            Activators[`${id}-active`] = node
            Object.keys(params).forEach(key => {
                Params[`${id}-${key}`] = node[key]
            })
            $(Widgets.effectWidget(id, params, name))
                .addClass('fxnode inactive')
                .appendTo($effects)
        })

        updateMeters()

        // Make all effects widgets the same size.
        const arr = Object.keys(effects).map(id => $(`#${id}`))
        $('.fxnode').css({
            width: Math.max.apply(null, arr.map(it => it.width())),
            height: Math.max.apply(null, arr.map(it => it.height())),
        })
    })();

    /**
     * Click event handler.
     * 
     * @param {event} e
     */
    function click(e) {
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
        const name = $target.attr('name')
        if (!name) {
            return
        }
        const value = $target.val()
        switch (name) {
            case 'oscillator-interval':
                let param = Oscillator.frequency
                param.value = Music.stepFreq(param.value, value) || param.value
                updateMeters()
                break
        }
    }

    /**
     * Change event handler.
     * 
     * @param {event} e
     */
    function change(e) {
        const $target = $(e.target)
        const id = $target.attr('id')
        const node = Activators[id]
        if (node) {
            let active = $target.is(':checked')
            node.active = active
            $target.closest('.fxnode')
                .toggleClass('active', active)
                .toggleClass('inactive', !active)
            return
        }
        const value = $target.val()
        const param = Params[id]
        if (param) {
            param.value = value
            updateMeters()
            return
        }
        const name = $target.attr('name')
        switch (name) {
            case 'oscillator-type':
                Oscillator.type = value
                return
        }
    }

    /**
     * Update meter text values.
     */
    function updateMeters() {
        Object.entries(Params).forEach(([id, {value}]) => {
            if (value === undefined) {
                return
            }
            const $meter = $(`#${id}-meter`)
            if (!$meter.length) {
                return
            }
            const {type} = $meter.data()
            let text
            switch (type) {  
                case 'integer':
                    text = Number(value).toFixed(0)
                    break
                case 'float':
                default:
                    text = Number(value).toFixed(2)
                    break
            }
            $meter.text(text)
        })
    }
})
