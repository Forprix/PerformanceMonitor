import time
import threading
from flask import Flask, jsonify
import psutil
from pynvml import *
interfaces = psutil.net_if_addrs()
local_network_addresses = []
for interface, addresses in interfaces.items():
    for address in addresses:
        if address.family == 2:
            if address.address.startswith('192.168'):
                local_network_addresses.append(address.address)
if len(local_network_addresses) == 0:
    print("Can't reach local network")
    exit(1)

local_network_address = local_network_addresses[0]
def get_gpu_stats():
    try:
        nvmlInit()
        num_gpus = nvmlDeviceGetCount()
        gpus_info = []
        for i in range(num_gpus):
            handle = nvmlDeviceGetHandleByIndex(i)
            util = nvmlDeviceGetUtilizationRates(handle)
            mem_info = nvmlDeviceGetMemoryInfo(handle)
            gpus_info.append({
                'gpu_utilization': util.gpu,
                'vram_total': mem_info.total,
                'vram_used': mem_info.used
            })
        return gpus_info
    except NVMLError as e:
        return {'error': str(e)}
    finally:
        try:
            nvmlShutdown()
        except:
            pass
def format_bytes(num_bytes):
    units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    i = 0
    while num_bytes >= 1024 and i < len(units) - 1:
        num_bytes /= 1024.0
        i += 1
    if units[i] == 'B':
        return f"{int(num_bytes)}{units[i]}"
    return f"{num_bytes:.2f}{units[i]}"
ram_used = None
ram_total = None
swap_used = None
swap_total = None
gpus_info = None
net_send = None
net_recv = None
_time = None
measured_once = False
def measure_os_performance1():
    global ram_used
    global ram_total
    global swap_used
    global swap_total
    global gpus_info
    global net_send
    global net_recv
    global measured_once
    global _time
    net_io = psutil.net_io_counters()
    bytes_sent_prev = net_io.bytes_sent
    bytes_recv_prev = net_io.bytes_recv
    prev_time = time.perf_counter() 
    while True:
        time.sleep(0.1)
        ram = psutil.virtual_memory()
        ram_used = ram.used
        ram_total = ram.total
        swap = psutil.swap_memory()
        swap_used = swap.used
        swap_total = swap.total
        gpus_info = get_gpu_stats()
        net_io = psutil.net_io_counters()
        new_time = time.perf_counter()
        _time = new_time
        dt_time = new_time - prev_time
        net_send = (net_io.bytes_sent - bytes_sent_prev) / dt_time
        net_recv = (net_io.bytes_recv - bytes_recv_prev) / dt_time
        prev_time = new_time
        bytes_sent_prev = net_io.bytes_sent
        bytes_recv_prev = net_io.bytes_recv
        measured_once = True

cpu_max = psutil.cpu_freq().max
cpus = None
def measure_os_performance2():
    global cpus
    while True:
        cpus = psutil.cpu_percent(percpu=True, interval=0.5)

app = Flask(__name__)

# TODO:
# Store statistics to check stress through long time
# Design UI for quick lookability and understandability over beauty

@app.route('/')
def main_route():
    if measured_once:
        return jsonify({
            'cpus': cpus,
            'cpu_max': cpu_max,
            'ram_used': ram_used,
            'ram_total': ram_total,
            'swap_used': swap_used,
            'swap_total': swap_total,
            'gpus': gpus_info,
            'net_send': net_send,
            'net_recv': net_recv,
            'time': _time
        })
@app.route('/ping')
def ping_route():
    if measured_once:
        return jsonify('alive')
if __name__ == '__main__':
    threading.Thread(target=measure_os_performance1, daemon=True).start()
    threading.Thread(target=measure_os_performance2, daemon=True).start()
    app.run(host=local_network_address, port=6969)