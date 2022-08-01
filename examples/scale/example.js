import $ from '../../lib/jquery.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'
import ScaleSample from '../../src/scale.js'
import {VexSampleScore} from '../../src/score.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
const scale = new ScaleSample(context)
volume.connect(context.destination)
scale.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]
volume.gain.value = 0.5

$(() => {

    const score = new VexSampleScore(scale.getSample(), {mergeRests: true})
    mixerWidget('mixer', null, mixer).addClass('fx1').appendTo('#inputs')
    nodeWidget('scale', scale).addClass('fx2').appendTo('#inputs')

    let drawId
    scale.onschedule = (sample, time) => {
        score.reload(sample, {noteDur: 240 / scale.beat.value})
        drawId = setTimeout(renderScore, (time - context.currentTime) * 1000)
    }

    $('#scale-stop').on('click', () => clearTimeout(drawId))

    function renderScore() {
        score.render($('#score').empty().get(0))
    }
})

