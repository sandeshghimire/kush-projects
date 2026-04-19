# Telemetry Dashboard

## What you'll learn
- How to serve real-time sensor data as JSON from the Pico
- How to build an HTML dashboard with live-updating gauges and charts
- How Server-Sent Events (SSE) push data to the browser without polling
- How to visualize robot state (battery, heading, distance, speed, mode)
- How professional robots use telemetry for monitoring and debugging

## Parts you'll need
- No additional parts needed (uses Pico 2 W built-in Wi-Fi and existing sensors)

## Background

Imagine you're a mission control operator at NASA, watching data from a Mars rover on big screens — battery level, temperature, speed, heading. That's **telemetry** — remote measurement. We're building the same thing for our robot! A live dashboard in your browser that shows everything happening inside the robot in real time.

In the last project, we sent commands TO the robot. Now we're going the other direction — the robot sends data BACK to us. The Pico will collect readings from all its sensors (battery voltage, ultrasonic distance, IMU heading, motor speed, current mode) and package them as **JSON** — a simple text format that web browsers understand perfectly.

Instead of having the browser ask "any new data?" over and over (which wastes resources), we'll use **Server-Sent Events (SSE)**. It's like opening a one-way radio channel: the browser connects once, and the Pico keeps sending updates down that open connection. The browser's JavaScript listens for new data and updates the gauges on the screen automatically.

Think of it like a scoreboard at a sports game. You don't have to keep asking "what's the score?" — the scoreboard just updates whenever something changes. That's SSE: the server pushes updates to you.

## Wiring

Uses existing wiring from previous projects. No new connections needed.
- Wi-Fi via Pico 2 W's built-in CYW43 chip
- All sensors (IMU, ultrasonic, line sensors) already wired from earlier projects

## The code

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "hardware/adc.h"
#include "hardware/i2c.h"
#include "lwip/tcp.h"

#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define HTTP_PORT     80

// --- Sensor reading structures ---
typedef struct {
    float battery_voltage;
    float heading_degrees;
    float speed_percent;
    int   distance_cm;
    int   left_line;
    int   right_line;
    const char *mode;
    uint32_t uptime_sec;
} telemetry_t;

static telemetry_t telemetry = {
    .battery_voltage = 5.0f,
    .heading_degrees = 0.0f,
    .speed_percent = 0.0f,
    .distance_cm = 0,
    .left_line = 500,
    .right_line = 500,
    .mode = "IDLE",
    .uptime_sec = 0
};

// --- Simulated sensor updates (replace with real reads) ---
void update_telemetry(void) {
    // In a real robot, read actual sensors here:
    // telemetry.battery_voltage = read_adc_voltage(26) * 2.0f;
    // telemetry.heading_degrees = get_imu_heading();
    // telemetry.distance_cm = read_ultrasonic();

    telemetry.uptime_sec = to_ms_since_boot(get_absolute_time()) / 1000;

    // Simulate varying values for demo purposes
    telemetry.battery_voltage = 4.5f + 0.5f *
        (float)((telemetry.uptime_sec % 20) > 10 ? 20 - (telemetry.uptime_sec % 20) : telemetry.uptime_sec % 20) / 10.0f;
    telemetry.heading_degrees = (float)(telemetry.uptime_sec * 3 % 360);
    telemetry.distance_cm = 10 + (telemetry.uptime_sec * 7) % 90;
    telemetry.speed_percent = 50.0f + 30.0f *
        ((telemetry.uptime_sec % 10) > 5 ? -1.0f : 1.0f);
}

// --- Build JSON string ---
int build_json(char *buf, size_t max_len) {
    return snprintf(buf, max_len,
        "{\"battery\":%.2f,\"heading\":%.1f,\"speed\":%.1f,"
        "\"distance\":%d,\"left_line\":%d,\"right_line\":%d,"
        "\"mode\":\"%s\",\"uptime\":%lu}",
        telemetry.battery_voltage, telemetry.heading_degrees,
        telemetry.speed_percent, telemetry.distance_cm,
        telemetry.left_line, telemetry.right_line,
        telemetry.mode, telemetry.uptime_sec);
}

// --- Dashboard HTML ---
static const char *DASHBOARD_HTML =
    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
    "<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>Robot Telemetry</title><style>"
    "body{margin:0;padding:15px;background:#0d1117;color:#c9d1d9;"
    "font-family:monospace;}"
    "h1{color:#58a6ff;text-align:center;margin:5px 0;}"
    ".grid{display:grid;grid-template-columns:1fr 1fr;"
    "gap:10px;max-width:500px;margin:10px auto;}"
    ".card{background:#161b22;border:1px solid #30363d;"
    "border-radius:8px;padding:12px;text-align:center;}"
    ".label{font-size:0.8em;color:#8b949e;}"
    ".value{font-size:1.8em;font-weight:bold;margin:5px 0;}"
    ".bar-bg{background:#21262d;height:12px;border-radius:6px;"
    "overflow:hidden;margin-top:6px;}"
    ".bar-fill{height:100%%;border-radius:6px;"
    "transition:width 0.3s;}"
    ".mode{grid-column:1/3;font-size:1.2em;}"
    ".mode .value{color:#f0883e;}"
    "#compass{width:80px;height:80px;margin:0 auto;}"
    ".log{max-width:500px;margin:10px auto;background:#161b22;"
    "border:1px solid #30363d;border-radius:8px;padding:10px;"
    "font-size:0.75em;max-height:100px;overflow-y:auto;}"
    "</style></head><body>"
    "<h1>ROBOT TELEMETRY</h1>"
    "<div class='grid'>"
    "  <div class='card'><div class='label'>BATTERY</div>"
    "    <div class='value' id='batt'>--V</div>"
    "    <div class='bar-bg'><div class='bar-fill' id='battbar'"
    "      style='width:0%%;background:#3fb950'></div></div></div>"
    "  <div class='card'><div class='label'>SPEED</div>"
    "    <div class='value' id='speed'>--%</div>"
    "    <div class='bar-bg'><div class='bar-fill' id='spdbar'"
    "      style='width:0%%;background:#58a6ff'></div></div></div>"
    "  <div class='card'><div class='label'>HEADING</div>"
    "    <div class='value' id='hdg'>--&deg;</div></div>"
    "  <div class='card'><div class='label'>DISTANCE</div>"
    "    <div class='value' id='dist'>--cm</div></div>"
    "  <div class='card mode'><div class='label'>MODE</div>"
    "    <div class='value' id='mode'>--</div></div>"
    "  <div class='card' style='grid-column:1/3'>"
    "    <div class='label'>UPTIME</div>"
    "    <div class='value' id='up'>--</div></div>"
    "</div>"
    "<div class='log' id='log'></div>"
    "<script>"
    "const es=new EventSource('/events');"
    "let lastMode='';"
    "es.onmessage=function(e){"
    "  let d=JSON.parse(e.data);"
    "  document.getElementById('batt').textContent=d.battery.toFixed(1)+'V';"
    "  document.getElementById('speed').textContent="
    "    Math.round(d.speed)+'%%';"
    "  document.getElementById('hdg').textContent="
    "    Math.round(d.heading)+'\\u00B0';"
    "  document.getElementById('dist').textContent=d.distance+'cm';"
    "  document.getElementById('mode').textContent=d.mode;"
    "  let bp=Math.min(100,Math.max(0,(d.battery-3.0)/3.0*100));"
    "  let bb=document.getElementById('battbar');"
    "  bb.style.width=bp+'%%';"
    "  bb.style.background=bp<20?'#f85149':bp<50?'#d29922':'#3fb950';"
    "  document.getElementById('spdbar').style.width="
    "    Math.abs(d.speed)+'%%';"
    "  let m=Math.floor(d.uptime/60),s=d.uptime%%60;"
    "  document.getElementById('up').textContent="
    "    m+'m '+s+'s';"
    "  if(d.mode!==lastMode&&lastMode){"
    "    let log=document.getElementById('log');"
    "    log.innerHTML+='['+m+'m'+s+'s] Mode: '+d.mode+'<br>';"
    "    log.scrollTop=log.scrollHeight;}"
    "  lastMode=d.mode;"
    "};"
    "es.onerror=function(){console.log('SSE reconnecting...');};"
    "</script></body></html>";

// --- SSE connection tracking ---
#define MAX_SSE_CLIENTS 4
static struct tcp_pcb *sse_clients[MAX_SSE_CLIENTS] = {0};

void sse_add_client(struct tcp_pcb *pcb) {
    for (int i = 0; i < MAX_SSE_CLIENTS; i++) {
        if (!sse_clients[i]) {
            sse_clients[i] = pcb;
            printf("SSE client %d connected\n", i);
            return;
        }
    }
    // No room — close
    tcp_close(pcb);
}

void sse_broadcast(void) {
    char json[256];
    build_json(json, sizeof(json));

    char sse_msg[300];
    int len = snprintf(sse_msg, sizeof(sse_msg),
                       "data: %s\n\n", json);

    for (int i = 0; i < MAX_SSE_CLIENTS; i++) {
        if (sse_clients[i]) {
            err_t err = tcp_write(sse_clients[i], sse_msg, len,
                                  TCP_WRITE_FLAG_COPY);
            if (err != ERR_OK) {
                tcp_close(sse_clients[i]);
                sse_clients[i] = NULL;
            } else {
                tcp_output(sse_clients[i]);
            }
        }
    }
}

// --- HTTP request handler ---
static err_t http_recv_cb(void *arg, struct tcp_pcb *pcb,
                          struct pbuf *p, err_t err) {
    if (!p) {
        // Remove from SSE clients if applicable
        for (int i = 0; i < MAX_SSE_CLIENTS; i++) {
            if (sse_clients[i] == pcb) sse_clients[i] = NULL;
        }
        tcp_close(pcb);
        return ERR_OK;
    }

    char *req = (char *)p->payload;

    if (strncmp(req, "GET /events", 11) == 0) {
        // SSE endpoint
        const char *hdr =
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: text/event-stream\r\n"
            "Cache-Control: no-cache\r\n"
            "Connection: keep-alive\r\n\r\n";
        tcp_write(pcb, hdr, strlen(hdr), TCP_WRITE_FLAG_COPY);
        tcp_output(pcb);
        sse_add_client(pcb);
    }
    else if (strncmp(req, "GET /api/data", 13) == 0) {
        // JSON API endpoint (for polling fallback)
        char json[256];
        build_json(json, sizeof(json));
        char resp[512];
        int rlen = snprintf(resp, sizeof(resp),
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: %d\r\n\r\n%s",
            (int)strlen(json), json);
        tcp_write(pcb, resp, rlen, TCP_WRITE_FLAG_COPY);
        tcp_output(pcb);
        tcp_close(pcb);
    }
    else if (strncmp(req, "GET / ", 6) == 0) {
        tcp_write(pcb, DASHBOARD_HTML, strlen(DASHBOARD_HTML),
                  TCP_WRITE_FLAG_COPY);
        tcp_output(pcb);
        tcp_close(pcb);
    }
    else {
        tcp_close(pcb);
    }

    pbuf_free(p);
    return ERR_OK;
}

static err_t http_accept_cb(void *arg, struct tcp_pcb *newpcb, err_t err) {
    tcp_recv(newpcb, http_recv_cb);
    return ERR_OK;
}

void start_server(void) {
    struct tcp_pcb *pcb = tcp_new();
    tcp_bind(pcb, IP_ADDR_ANY, HTTP_PORT);
    pcb = tcp_listen(pcb);
    tcp_accept(pcb, http_accept_cb);
    printf("Dashboard server on port %d\n", HTTP_PORT);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // ADC for battery monitoring
    adc_init();
    adc_gpio_init(26);

    // Wi-Fi init
    if (cyw43_arch_init()) {
        printf("Wi-Fi init failed!\n");
        return 1;
    }
    cyw43_arch_enable_sta_mode();
    printf("Connecting to '%s'...\n", WIFI_SSID);

    if (cyw43_arch_wifi_connect_timeout_ms(
            WIFI_SSID, WIFI_PASSWORD,
            CYW43_AUTH_WPA2_AES_PSK, 15000)) {
        printf("Wi-Fi failed!\n");
        return 1;
    }

    printf("Connected! Dashboard: http://%s\n",
           ip4addr_ntoa(netif_ip4_addr(netif_list)));

    start_server();

    // Main loop: update sensors and broadcast telemetry
    uint32_t last_broadcast = 0;
    while (true) {
        cyw43_arch_poll();

        uint32_t now = to_ms_since_boot(get_absolute_time());
        if (now - last_broadcast >= 200) {  // 5 Hz update rate
            last_broadcast = now;
            update_telemetry();
            sse_broadcast();
        }

        sleep_ms(1);
    }

    cyw43_arch_deinit();
    return 0;
}
```

## Try it
- Open the dashboard on your phone and computer at the same time — both update live!
- Add a line sensor display showing left and right sensor values as colored bars
- Add an event log entry whenever the distance drops below 15 cm (obstacle nearby)
- Try the `/api/data` endpoint in your browser to see the raw JSON

## Challenge

Add a **heading compass** to the dashboard. Use an SVG or Canvas element to draw a circle with a needle that points in the robot's heading direction. Update it in real time from the SSE data. Hint: use CSS `transform: rotate(Xdeg)` on an arrow element for the simplest approach.

## Summary

Our robot now broadcasts its sensor data in real time over Wi-Fi. The dashboard uses Server-Sent Events for efficient one-way streaming — the browser connects once and the Pico pushes updates 5 times per second. We display battery, speed, heading, distance, and mode with color-coded gauges. There's also a JSON API endpoint for other programs to consume. This is how professional robots are monitored.

## How this fits the robot

The telemetry dashboard is your mission control center. When the robot is running autonomously in Project 20, you'll watch the dashboard to see what it's doing — which mission it's on, how far it's traveled, what obstacles it's detecting. It's also invaluable for debugging: if the robot does something unexpected, the telemetry log shows exactly what sensor readings led to that decision.
