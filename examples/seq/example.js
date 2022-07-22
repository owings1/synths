/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
// import * as Music from '../../src/music.js'
// import * as Effects from '../../src/effects.js'
import * as Widgets from '../../src/widgets.js'

const context = new AudioContext()
    
const main = new GainNode(context)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
]


main.connect(context.destination)


$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', 'Mixer', mixer))
    $('#mixer').addClass('fx1')
    $(document).on({click, change})
    $('button').button()
})

/**
 * Click event handler.
 * 
 * @param {Event} e
 */
function click(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    switch (id) {
        default:
            break
    }
    const name = $target.attr('name')
    if (!name) {
        return
    }
    const value = $target.val()
    switch (name) {
        default:
            break
    }
}

/**
 * Change event handler.
 * 
 * @param {Event} e
 */
function change(e) {
    const $target = $(e.target)
    const value = $target.val()
    const {param} = $target.data()
    if (param) {
        param.value = value
        updateMeters()
        return
    }
    const name = $target.attr('name')
    switch (name) {
        default:
            break
    }
}

/**
 * Update meter text values.
 */
function updateMeters() {
    $('.meter').each(function() {
        const $meter = $(this)
        const {def, param} = $meter.data()
        if (!param) {
            return
        }
        const {type} = def || {}
        const {value} = param
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
