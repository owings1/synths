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
 * @return {object} A jQuery object
 */
export function mixerWidget(id, title, infos) {
    // faux AudioNode
    const node = Object.fromEntries(infos.map(
        ({name, param}) => [name, param]
    ))
    const params = Object.fromEntries(
        infos.map(({name, label}) => [name, {
            label: label || name,
            type: 'float',
            min: 0.0,
            max: 1.0,
            step: 0.01,
        }])
    )
    return effectWidget(id, node, {title, params})
}

/**
 * Build HTML for AudioNode.
 * 
 * @param {String} id The effect ID.
 * @param {AudioNode} node The audio node.
 * @param {object} opts The options
 * @param {object} opts.params The parameter definitions.
 * @param {String} opts.title The title.
 * @return {object} A jQuery object
 */
export function effectWidget(id, node, opts) {
    const {params, title} = opts
    const $section = $('<section/>').attr({id})
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
            {value: node.active},
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
    let inputHtml
    let labelHtml = ''
    let meterHtml = ''
    let unitHtml = ''
    if (label) {
        labelHtml = $('<label/>')
            .attr({for: id}).text(label)
            .get(0).outerHTML
    }
    switch (def.type) {
        case 'boolean':
            inputHtml = $('<input/>')
                .prop('checked', Boolean(value))
                .attr({id, type: 'checkbox'})
                .get(0).outerHTML
            break
        case 'integer':
        case 'float':
            let {min, max, step} = def
            inputHtml = $('<input/>')
                .attr({id, type: 'range', value, min, max, step})
                .data({param, def})
                .get(0).outerHTML
            meterHtml = $('<span/>')
                .attr({id: `${id}-meter`}).data({def})
                .get(0).outerHTML
            break
        default:
            $.error(`Unsupported param type: ${def.type}`)
    }
    if (unit) {
        unitHtml = $('<span/>')
            .addClass('unit').data({unit}).text(unit)
            .get(0).outerHTML
    }
    return $(`
        <tr>
            <td>${labelHtml}</td>
            <td>${inputHtml}</td>
            <td>${meterHtml}${unitHtml}</td>
        </tr>
    `)
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
    const $div = $('<div/>')
    const $divp = $('<div/>').text('+').appendTo($div)
    const $divm = $('<div/>').html('-&nbsp;').appendTo($div)
    for (let i = 1; i < 13; i++) {
        $('<button/>')
            .attr({name, value: String(i)})
            .text(labels[i]).appendTo($divp)
        $('<button/>')
            .attr({name, value: String(-i)})
            .text(labels[i]).appendTo($divm)

    }
    return $div
}