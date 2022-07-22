/**
 * WebAudio effects HTML.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import $ from './jquery.js'

/**
 * @param {String} id The mixer ID.
 * @param {String} title
 * @param {object[]} infos Gain param infos with `name`, `label`, `param`.
 * @param {String} infos[].name
 * @param {String} infos[].label
 * @param {AudioParam} infos[].param
 * @return {object} A jQuery object
 */
export function mixerWidget(id, title, infos) {
    // faux AudioNode
    const node = Object.fromEntries(infos.map(
        ({name, param}) => [name, param]
    ))
    const params = Object.fromEntries(
        infos.map(({name, label, min, max, step}) => {
            return [name, {
                label,
                type: 'float',
                min: min || 0.0,
                max: max || 1.0,
                step: step || 0.01,
            }]
        })
    )
    return nodeWidget(id, node, {title, params}).addClass('mixer')
}

/**
 * Build HTML for AudioNode.
 * 
 * @param {String} id The node ID.
 * @param {AudioNode|object} node Node object with properties for each param.
 * @param {object} opts The options
 * @param {object} opts.params The parameter definitions. See `paramWidget()`.
 * @param {String} opts.title The title.
 * @return {object} A jQuery object
 */
export function nodeWidget(id, node, opts) {
    const {params, title} = opts
    const $section = $('<section/>').attr({id}).addClass('node')
    // Heading
    if (title) {
        $('<h2/>').text(title).appendTo($section)
    }
    // Table
    const $table = $('<table/>').appendTo($section)
    // Active checkbox
    if (node.active !== undefined) {
        $table.append(paramWidget(
            [id, 'active'].join('-'),
            {
                get value() {return node.active},
                set value(v) { node.active = v },
            },
            {label: 'Active', type: 'boolean'},
        ))
    }
    // Params
    Object.entries(params).forEach(([name, def]) => {
        const paramId = [id, name].join('-')
        const param = node[name]
        $table.append(paramWidget(paramId, param, def))
    })
    return $section
}

/**
 * @param {String} id The param ID.
 * @param {AudioParam|object} param The parameter instance, or object with
 *  `value` property.
 * @param {object} def The parameter definition.
 * @param {String} def.type The value type, 'integer', 'float'.
 * @param {Number} def.min Range minimum.
 * @param {Number} def.max Range maximum.
 * @param {Number} def.step Range step.
 * @return {object} A jQuery object.
 */
export function paramWidget(id, param, def) {
    const {value} = param
    const {label, unit} = def
    const $tr = $('<tr/>').addClass('param')
    const $labelTd = $('<td/>').appendTo($tr)
    const $inputTd = $('<td/>').appendTo($tr)
    const $meterTd = $('<td/>').appendTo($tr)
    if (label) {
        $('<label/>')
            .attr({for: id})
            .text(label)
            .appendTo($labelTd)
    }
    switch (def.type) {
        case 'boolean':
            $('<input/>')
                .attr({id, type: 'checkbox'})
                .prop('checked', Boolean(value))
                .data({param, def})
                .appendTo($inputTd)
            break
        case 'integer':
        case 'float':
            let {min, max, step} = def
            let fixed = 2 * (def.type === 'float')
            let display = Number(value).toFixed(fixed)
            $('<input/>')
                .attr({id, type: 'range', value, min, max, step})
                .val(value)
                .data({param, def})
                .appendTo($inputTd)
            $('<span/>')
                .attr({id: `${id}-meter`})
                .addClass('meter')
                .data({
                    param,
                    def,
                    update: () => {
                        $(`#${id}-meter`)
                            .text(Number(param.value).toFixed(fixed))
                    }
                })
                .text(display)
                .appendTo($meterTd)
            if (unit) {
                $('<span/>')
                    .addClass('unit')
                    .data({unit})
                    .text(unit)
                    .appendTo($meterTd)
            }
            break
        default:
            $.error(`Unsupported param type: ${def.type}`)
    }
    return $tr
}

export function intervalButtons(name) {
    const labels = [
        null,
        'min 2nd',
        'Maj 2nd',
        'min 3rd',
        'Maj 3rd',
        '4th',
        'Tritone',
        '5th',
        'min 6th',
        'Maj 6th',
        'min 7th',
        'Maj 7th',
        'Octave',
    ]
    const $table = $('<table/>').addClass('intervals')
    const trs = ['Up', 'Down'].map(text =>
        $('<tr/>')
            .append($('<td/>').text(text))
            .appendTo($table)
    )
    const [$up, $down] = trs.map($tr =>
        $('<td/>').appendTo($tr)
    )
    trs.forEach($tr => $tr.append('<td/>'))
    for (let i = 1; i < 13; i++) {
        $('<button/>')
            .attr({name, value: String(i)})
            .text(labels[i])
            .appendTo($up)
        $('<button/>')
            .attr({name, value: String(-i)})
            .text(labels[i])
            .appendTo($down)

    }
    return $table
    // return $div
}