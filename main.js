import { exec } from 'child_process'
import express from 'express'
import fetch from 'node-fetch'
import * as WebSocket from 'ws'

const ws = new WebSocket.WebSocketServer({
    port: 3001
})

const allWsClients = new Set
function wsBroadcast(data) {
    for (const wsClient of allWsClients)
        wsClient.send(data)
}
ws.on('connection', wsClient => {
    allWsClients.add(wsClient)
    const onClose = () => {
        allWsClients.delete(wsClient)
        wsClient.off('close', onClose)
    }
    wsClient.on('close', onClose)
})
const app = express()

const getActiveIps = () => new Promise((resolve, reject) => {
    exec(process.platform === 'win32' ? 'arp -a' : 'arp -n', (err, stdout) => {
        if (err) return reject(err)
        resolve(stdout.match(/\d+\.\d+\.\d+\.\d+/g) ?? [])
    })
})

const pingIp = ip => new Promise(resolve => {
    const isWin = process.platform === 'win32'
    const paramCount = isWin ? '-n' : '-c'
    const paramTimeout = isWin ? '-w 500' : '-W 0.5'
    exec(`ping ${paramCount} 1 ${paramTimeout} ${ip}`, err => resolve(err ? null : ip))
})

async function isHttpAlive(url, timeout = 500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    try {
        const r = await (await fetch(url, { signal: controller.signal })).json()
        clearTimeout(id)
        return r == 'alive'
    } catch {
        return false
    }
}

const getAliveIps = async () => {
    const activeIps = await getActiveIps()
    const filteredIps = activeIps.filter(ip => ip.startsWith('192.168') && ip !== '192.168.255.255')
    const promises = []
    for (const ip of filteredIps)
        promises.push((async ip => {
            if (!(await pingIp(ip))) return null
            if (!(await isHttpAlive(`http://${ip}:6969/ping`))) return null
            return ip
        })(ip))
    return (await Promise.all(promises)).filter(Boolean)
}

const sleep = s => new Promise(res => setTimeout(res, s * 1000))

const aliveIps = new Set

// 1-st Loop resolving alive pcs
;(async () => {
    while (true) {
        const pcs = await getAliveIps()
        aliveIps.clear()
        for (const pc of pcs)
            aliveIps.add(pc)
        await sleep(3)
    }
})()

// 2-nd Loop receiving their stats and broadcast them
;(async () => {
    while (true) {
        for (const ip of aliveIps) {
            try {
                const stats = await (await fetch(`http://${ip}:6969`)).json()
                wsBroadcast(JSON.stringify({
                    op: 'UPDATE_STATS',
                    ip,
                    stats
                }))
            } catch {
                aliveIps.delete(ip)
            }
        }
        await sleep(0.1)
    }
})()

// 3-rd Interpolate and display that on client-side

app.use(express.static('public'))

app.listen(3000, () => {
    console.log('http://localhost:3000')
})