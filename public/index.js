import { $el } from './util.mjs'



const sleep = s => new Promise(res => setTimeout(res, s * 1000))

function elementFromHTML(html) {
    var el = document.createElement('div')
    el.innerHTML = html.split('\n').map(x => x.trim()).join('')
    
    if (el.children.length == 1) return el.firstChild
    else return [...el.children]
}

const ws = new WebSocket(`ws://${location.hostname}:3001`)

const pcs = {}

ws.addEventListener('message', e => {
    const msg = JSON.parse('' + e.data)
    if (msg.op == 'UPDATE_STATS') {
        pcs[msg.ip] ??= {}
        pcs[msg.ip] = { ...pcs[msg.ip], ...msg.stats }
    }
})

function formatBytes(numBytes) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    let i = 0
  
    while (numBytes >= 1024 && i < units.length - 1) {
      numBytes /= 1024
      i++
    }
  
    if (units[i] === 'B')
      return `${Math.floor(numBytes)}${units[i]}`
  
    return `${numBytes.toFixed(2)}${units[i]}`
}


;(async () => {
    const alias = await (await fetch('./pc_alias.json')).json()
    let old_t = performance.now() / 1000
    while (true) {
        let new_t = performance.now() / 1000
        let dt = new_t - old_t
        await sleep(1 / 60)
        for (const [ip, pc] of Object.entries(pcs)) {
            pc.last_local_time ??= new_t
            if (pc.last_time != pc.time) {
                pc.last_time = pc.time
                pc.last_local_time = new_t
            } 
            
            if (pc.el == null)
                document.body.append(pc.el = elementFromHTML(`
                    <div class="stats-block">
                        <div class="pc-id"><div>${alias[ip] ?? ip}</div></div>
                        <div class="gpus">
                        </div>
                        <div class="ram">
                            <div class="ram-lines">
                                <div class="ram-line">
                                    <div class="ram-line-label">RAM&nbsp;&nbsp;&nbsp;</div>
                                    <div class="ram-line-progress-bar">
                                        <div class="ram-line-progress-bar-progress"></div>
                                    </div>
                                    <div class="ram-line-text"></div>
                                </div>
                                <div class="swap-line">
                                    <div class="swap-line-label">SWAP&nbsp;&nbsp;</div>
                                    <div class="swap-line-progress-bar">
                                        <div class="swap-line-progress-bar-progress"></div>
                                    </div>
                                    <div class="swap-line-text"></div>
                                </div>
                            </div>
                        </div>
                        <div class="cpu">
                            <div class="cpu-lines">
                            </div>
                        </div>
                    </div>
                `))
            const { el } = pc
            
            if ((new_t - pc.last_local_time) > 2) 
                el.classList.add('disconnected')
            else
                el.classList.remove('disconnected')

            {
                const x = el.$1('.gpus')
                for (let i = 0; i < pc.gpus.length; ++i) {
                    const gpu = pc.gpus[i]
                    let el = x.$1(`.gpu${i + 1}`)
                    if (el == null)
                        x.append(el = elementFromHTML(`
                            <div class="gpu${i + 1}">
                                <div class="gpu-lines">
                                    <div class="vram-line">
                                        <div class="vram-line-label">VRAM${i}&nbsp;</div>
                                        <div class="vram-line-progress-bar">
                                            <div class="vram-line-progress-bar-progress"></div>
                                        </div>
                                        <div class="vram-line-text"></div>
                                    </div>
                                    <div class="gpuu-line">
                                        <div class="gpuu-line-label">GPU${i + 1}&nbsp;&nbsp;</div>
                                        <div class="gpuu-line-progress-bar">
                                            <div class="gpuu-line-progress-bar-progress"></div>
                                        </div>
                                        <div class="gpuu-line-text"></div>
                                    </div>
                                </div>
                            </div>
                        `))
                        
                    pc[`gpu_utilization_v${i + 1}`] ??= gpu.gpu_utilization
                    pc[`gpu_utilization_v${i + 1}`] += (gpu.gpu_utilization - pc[`gpu_utilization_v${i + 1}`]) * Math.min((1 - Math.exp(-8 * dt)), 1)
                    el.$1('.gpuu-line-progress-bar-progress').style.width = `${pc[`gpu_utilization_v${i + 1}`]}%`
                    el.$1('.gpuu-line-text').innerText = `${pc[`gpu_utilization_v${i + 1}`].toFixed(2)}%`
                    
                    pc[`vram_used_v${i + 1}`] ??= gpu.vram_used
                    pc[`vram_used_v${i + 1}`] += (gpu.vram_used - pc[`vram_used_v${i + 1}`]) * Math.min((1 - Math.exp(-1 * dt)), 1)
                    el.$1('.vram-line-progress-bar-progress').style.width = `${(pc[`vram_used_v${i + 1}`]/gpu.vram_total)*100}%`
                    el.$1('.vram-line-text').innerText = `${formatBytes(pc[`vram_used_v${i + 1}`])}/${formatBytes(gpu.vram_total)}`
                    
                }
            }
            {
                const x = el.$1('.ram')
               
                pc.ram_used_v ??= pc.ram_used
                pc.ram_used_v = pc.ram_used_v + (pc.ram_used - pc.ram_used_v) * Math.min((1 - Math.exp(-1 * dt)), 1)
                x.$1('.ram-line-progress-bar-progress').style.width = `${(pc.ram_used_v/pc.ram_total)*100}%`
                x.$1('.ram-line-text').innerText = `${formatBytes(pc.ram_used_v)}/${formatBytes(pc.ram_total)}`

                pc.swap_used_v ??= pc.swap_used
                pc.swap_used_v = pc.swap_used_v + (pc.swap_used - pc.swap_used_v) * Math.min((1 - Math.exp(-1 * dt)), 1)
                x.$1('.swap-line-progress-bar-progress').style.width = `${(pc.swap_used_v/pc.swap_total)*100}%`
                x.$1('.swap-line-text').innerText = `${formatBytes(pc.swap_used_v)}/${formatBytes(pc.swap_total)}`
                
                // x.innerText = JSON.stringify({ram_used: pc.ram_used_v, ram_total: pc.ram_total, swap_used: pc.swap_used, swap_total: pc.swap_total})
            }
            {
                const x = el.$1('.cpu-lines')
                for (let i = 0; i < pc.cpus.length; ++i) {
                    const cpu = pc.cpus[i]
                    let el = x.$1(`.cpu-line${i + 1}`)
                    if (el == null)
                        x.append(el = elementFromHTML(`
                            <div class="cpu-line cpu-line${i + 1}">
                                <div class="cpu-line-label">CPU${i + 1}&nbsp;&nbsp;</div>
                                <div class="cpu-line-progress-bar">
                                    <div class="cpu-line-progress-bar-progress"></div>
                                </div>
                                <div class="cpu-line-text"></div>
                            </div>
                        `))
                    
                    pc[`cpu_v${i + 1}`] ??= cpu
                    pc[`cpu_v${i + 1}`] += (cpu - pc[`cpu_v${i + 1}`]) * Math.min((1 - Math.exp(-3 * dt)), 1)
                    el.$1('.cpu-line-progress-bar-progress').style.width = `${pc[`cpu_v${i + 1}`]}%`
                    el.$1('.cpu-line-text').innerText = `${pc[`cpu_v${i + 1}`].toFixed(2)}%`
                    
                }
            }
        }
        old_t = new_t
    }
})()