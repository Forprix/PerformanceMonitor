function _$(selector) {
    const arr = [...this.querySelectorAll(selector)]
    arr.addEventListener = (...args) => {
        for (const el of arr)
            el.addEventListener(...args)
    }
    arr.removeEventListener = (...args) => {
        for (const el of arr)
            el.removeEventListener(...args)
    }
    arr.el = arr[0]
    arr.on = arr.addEventListener
    arr.off = arr.removeEventListener
    return arr
}
function _$1(selector) {
    return this.querySelector(selector)
}

// Faking JQuery
// Alternative to document.querySelectorAll
export const $ = _$.bind(document)

/**
 * @param {string} selector 
 * @returns {HTMLElement}
*/
// Same as document.querySelector
export const $1 = _$1.bind(document)

Element.prototype.$ = _$
Document.prototype.$ = _$
ShadowRoot.prototype.$ = _$
DocumentFragment.prototype.$ = _$

Element.prototype.$1 = _$1
Document.prototype.$1 = _$1
ShadowRoot.prototype.$1 = _$1
DocumentFragment.prototype.$1 = _$1

// Creates Element
export function $el(tag, options) {
    const el = document.createElement(tag)
    if (options.content)
        el.innerText = options.content
    if (options.attrs)
        for (const [key, val] of Object.entries(options.attrs))
            el.setAttribute(key, val)
    if (options.data)
        for (const [key, val] of Object.entries(options.data))
            el.setAttribute(`data-${key}`, val)
    if (options.class)
        el.classList.add(options.class)
    if (options.classes)
        for (const class_ of options.classes)
            el.classList.add(class_)
    if (options.id)
        el.id = options.id
    if (options.style) {
        el.style = ''
        for (const [key, val] of Object.entries(options.style))
            el.style[key] = val
    }
    if (options.child)
        el.appendChild(options.child)
    if (options.children)
        el.append(...options.children)
    return el
}

EventTarget.prototype.on = EventTarget.prototype.addEventListener
EventTarget.prototype.off = EventTarget.prototype.removeEventListener
EventTarget.prototype.once = function (type, listener, options) {
    const handler = function (event) {
        listener.call(this, event)
        this.removeEventListener(type, handler, options)
    }
    this.addEventListener(type, handler, options)
}

const urlResolver = document.createElement('a')
// Normalizes URL
export function $url(url) {
    urlResolver.href = url
    return urlResolver.href
}

// Move to man.mjs
export async function $download(url, name) {
    // Make HEAD request
    var link = document.createElement('a')
    const blob = await (await fetch(url)).blob()
    link.href = URL.createObjectURL(blob)
    link.download = name
    link.click()
}
export function $shuffle(array) {
    let currentIndex = array.length
    let randomIndex
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }
    return array
}

export async function $req(url) {
    const ext = url.match(/(?<=\.)[^.]*$/)?.[0] ?? ''
    if (/^json$/i.test(ext))
        return (await (await fetch(url)).json())
    return (await (await fetch(url)).text())
}

/**
* Converts HSV (Hue, Saturation, Value) to RGB (Red, Green, Blue).
* @param hsv An array representing the HSL values [H, S, V] where H ranges from 0 to 360, and S, V range from 0 to 1.
* @returns An array representing the RGB values [R, G, B] where R, G, B range from 0 to 255.
*/
export function $hsv2rgb(hsv) {
    if (!(hsv instanceof Array))
        throw 'hsv must be array'
    const [h, s, v] = [
        $fmod(hsv[0], 360),
        $clamp(hsv[1], 100) / 100,
        $clamp(hsv[2], 100) / 100
    ]

    const c = v * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = v - c
    
    let rgb = [0, 0, 0]

    const i = (h / 60) | 0

    let i1 = (i / 2) | 0
    let i2 = (i1 + 1) % 3
    if (i % 2)
        [i1, i2] = [i2, i1]
    
    rgb[i1] = c
    rgb[i2] = x
    
    const ret = rgb.map(x => (x + m) * 255)
    ret.toString = function () { return `#${this.map(x => (x | 0).toString(16).padStart(2, '0')).join('')}` } 
    return ret
}

export function $clamp(num, a, b = 0) {
    const [min, max] = a < b ? [a, b] : [b, a]

    if (num >= max)
        return max
    if (num <= min)
        return min
    return num
}
export function $fmod(a, b) {
    const q = Math.floor(a / b)
    return a - b * q
}

export function $time() {
    return performance.now() / 1000
}

export function $remap(value, srcRange, dstRange = [0, 1]) {
    return dstRange[0] + (value - srcRange[0]) / (srcRange[1] - srcRange[0]) * (dstRange[1] - dstRange[0])
}

export function $sleep(sec = 0) {
    return new Promise(res => setTimeout(res, sec * 1000))
}

/**
 * @param {any[]} arr 
*/
export function $choice(arr) {
    return arr[~~(Math.random() * arr.length)]
}

// Rename:
// $url
// $download
// $shuffle
// $req
// $hsv2rgb
// $clamp
// $fmod
// $time
// $remap
// $sleep
// $choice

// Repurpose:
// $req
// $download

// Add:
// lerp
// lerpd