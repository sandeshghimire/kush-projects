# Wi-Fi Web Joystick Control

## What you'll learn
- How to use the Pico 2 W's built-in Wi-Fi to create a web server
- How to serve an HTML page with a virtual joystick from the Pico itself
- How HTTP requests carry joystick data to control the motors
- How to map joystick X/Y values to differential drive (left/right motor speeds)
- The basics of embedded web servers and network programming

## Parts you'll need
- No additional parts needed (uses the Pico 2 W's built-in CYW43 Wi-Fi chip)

## Background

Bluetooth remote control is cool, but you need a special app. What if anyone could control the robot just by opening a web page on their phone? That's what we'll build — the Pico 2 W becomes a tiny web server that serves a page with a virtual joystick. No app to install, works on any phone or tablet with a browser!

The **Pico 2 W** has a CYW43 Wi-Fi chip built right in. We can connect to your home Wi-Fi network and get an IP address (like 192.168.1.42). Then the Pico runs a simple HTTP server — the same kind of server that runs every website in the world, just much tinier. When someone opens that IP address in their browser, the Pico sends back an HTML page.

The HTML page has a **virtual joystick** — a circle you can drag with your finger (on a phone) or mouse (on a computer). As you drag the joystick, JavaScript on the page sends the joystick position to the Pico as an HTTP request. The Pico receives the joystick X and Y values and translates them into motor speeds.

The mapping from joystick to motors uses **differential drive**: the Y axis (forward/backward) sets the base speed, and the X axis (left/right) adds a difference between the motors. Push the joystick forward and both motors go forward. Push it forward-right and the left motor goes faster than the right — the robot curves right!

Think of it like rowing a boat: both oars forward = go straight. Right oar faster = turn left. That's differential drive.

## Wiring

Uses existing wiring from previous projects. No new connections needed.
- The Pico 2 W's CYW43 Wi-Fi chip is built into the board
- Motors remain on GP2/GP3 (left) and GP6/GP7 (right)

## The code

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "hardware/pwm.h"
#include "lwip/tcp.h"

// Wi-Fi credentials — change these to your network!
#define WIFI_SSID     "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Motor pins
#define LEFT_FWD   2
#define LEFT_REV   3
#define RIGHT_FWD  6
#define RIGHT_REV  7

#define HTTP_PORT  80

// --- Motor control ---
void setup_motor_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 999);
    pwm_set_enabled(slice, true);
}

void set_motor(uint fwd, uint rev, float speed) {
    uint16_t duty = (uint16_t)(fabsf(speed) * 999);
    if (speed >= 0) {
        pwm_set_gpio_level(fwd, duty);
        pwm_set_gpio_level(rev, 0);
    } else {
        pwm_set_gpio_level(fwd, 0);
        pwm_set_gpio_level(rev, duty);
    }
}

// Map joystick x,y (-1 to 1) to left/right motor speeds
void joystick_to_motors(float x, float y) {
    // Differential drive mixing
    float left  = y + x;
    float right = y - x;

    // Clamp to [-1, 1]
    if (left > 1.0f) left = 1.0f;
    if (left < -1.0f) left = -1.0f;
    if (right > 1.0f) right = 1.0f;
    if (right < -1.0f) right = -1.0f;

    set_motor(LEFT_FWD, LEFT_REV, left);
    set_motor(RIGHT_FWD, RIGHT_REV, right);
}

// --- HTML page served by the Pico ---
static const char *HTML_PAGE =
    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
    "<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width,initial-scale=1,"
    "user-scalable=no'>"
    "<title>Pico Robot</title>"
    "<style>"
    "body{margin:0;background:#1a1a2e;color:#fff;font-family:sans-serif;"
    "display:flex;flex-direction:column;align-items:center;height:100vh;"
    "justify-content:center;touch-action:none;}"
    "h1{margin:10px;font-size:1.5em;}"
    "#pad{width:250px;height:250px;background:#16213e;border-radius:50%%;"
    "position:relative;border:3px solid #0f3460;}"
    "#knob{width:70px;height:70px;background:#e94560;border-radius:50%%;"
    "position:absolute;top:50%%;left:50%%;"
    "transform:translate(-50%%,-50%%);cursor:pointer;}"
    "#info{margin:15px;font-size:0.9em;color:#aaa;}"
    "</style></head><body>"
    "<h1>Pico Robot Control</h1>"
    "<div id='pad'><div id='knob'></div></div>"
    "<div id='info'>L: <span id='lv'>0</span> | "
    "R: <span id='rv'>0</span></div>"
    "<script>"
    "const pad=document.getElementById('pad');"
    "const knob=document.getElementById('knob');"
    "const lv=document.getElementById('lv');"
    "const rv=document.getElementById('rv');"
    "let active=false,cx=0,cy=0,r=125;"
    "function pos(e){"
    "  let t=e.touches?e.touches[0]:e;"
    "  let b=pad.getBoundingClientRect();"
    "  let x=t.clientX-b.left-r,y=t.clientY-b.top-r;"
    "  let d=Math.sqrt(x*x+y*y);"
    "  if(d>r){x=x/d*r;y=y/d*r;}"
    "  return[x,y];}"
    "function update(x,y){"
    "  knob.style.left=(x+r)+'px';"
    "  knob.style.top=(y+r)+'px';"
    "  let nx=(x/r).toFixed(2),ny=(-y/r).toFixed(2);"
    "  let l=Math.min(1,Math.max(-1,+ny+ +nx)).toFixed(2);"
    "  let ri=Math.min(1,Math.max(-1,+ny- +nx)).toFixed(2);"
    "  lv.textContent=l;rv.textContent=ri;"
    "  fetch('/drive?l='+l+'&r='+ri);}"
    "function start(e){active=true;let[x,y]=pos(e);update(x,y);}"
    "function move(e){if(!active)return;e.preventDefault();"
    "  let[x,y]=pos(e);update(x,y);}"
    "function end(){active=false;update(0,0);"
    "  knob.style.left=r+'px';knob.style.top=r+'px';}"
    "pad.addEventListener('mousedown',start);"
    "pad.addEventListener('mousemove',move);"
    "pad.addEventListener('mouseup',end);"
    "pad.addEventListener('mouseleave',end);"
    "pad.addEventListener('touchstart',start,{passive:false});"
    "pad.addEventListener('touchmove',move,{passive:false});"
    "pad.addEventListener('touchend',end);"
    "</script></body></html>";

// --- HTTP server ---
static err_t http_recv(void *arg, struct tcp_pcb *pcb, struct pbuf *p,
                       err_t err) {
    if (!p) {
        tcp_close(pcb);
        return ERR_OK;
    }

    char *req = (char *)p->payload;

    // Parse /drive?l=X&r=Y
    if (strncmp(req, "GET /drive?", 11) == 0) {
        char *lp = strstr(req, "l=");
        char *rp = strstr(req, "r=");
        if (lp && rp) {
            float left_speed = strtof(lp + 2, NULL);
            float right_speed = strtof(rp + 2, NULL);

            // Clamp values for safety
            if (left_speed > 1.0f) left_speed = 1.0f;
            if (left_speed < -1.0f) left_speed = -1.0f;
            if (right_speed > 1.0f) right_speed = 1.0f;
            if (right_speed < -1.0f) right_speed = -1.0f;

            set_motor(LEFT_FWD, LEFT_REV, left_speed);
            set_motor(RIGHT_FWD, RIGHT_REV, right_speed);
        }
        const char *ok = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK";
        tcp_write(pcb, ok, strlen(ok), TCP_WRITE_FLAG_COPY);
    }
    // Serve HTML page for root
    else if (strncmp(req, "GET / ", 6) == 0 ||
             strncmp(req, "GET /index", 10) == 0) {
        tcp_write(pcb, HTML_PAGE, strlen(HTML_PAGE), TCP_WRITE_FLAG_COPY);
    }

    tcp_output(pcb);
    pbuf_free(p);
    tcp_close(pcb);
    return ERR_OK;
}

static err_t http_accept(void *arg, struct tcp_pcb *newpcb, err_t err) {
    tcp_recv(newpcb, http_recv);
    return ERR_OK;
}

void start_http_server(void) {
    struct tcp_pcb *pcb = tcp_new();
    tcp_bind(pcb, IP_ADDR_ANY, HTTP_PORT);
    pcb = tcp_listen(pcb);
    tcp_accept(pcb, http_accept);
    printf("HTTP server listening on port %d\n", HTTP_PORT);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Initialize Wi-Fi
    if (cyw43_arch_init()) {
        printf("Wi-Fi init failed!\n");
        return 1;
    }
    cyw43_arch_enable_sta_mode();

    printf("Connecting to Wi-Fi '%s'...\n", WIFI_SSID);
    int result = cyw43_arch_wifi_connect_timeout_ms(
        WIFI_SSID, WIFI_PASSWORD, CYW43_AUTH_WPA2_AES_PSK, 15000);

    if (result) {
        printf("Wi-Fi connection failed! Error: %d\n", result);
        return 1;
    }

    // Print IP address
    printf("Connected! IP: %s\n",
           ip4addr_ntoa(netif_ip4_addr(netif_list)));
    printf("Open http://%s in your browser\n",
           ip4addr_ntoa(netif_ip4_addr(netif_list)));

    // Initialize motors
    setup_motor_pin(LEFT_FWD);
    setup_motor_pin(LEFT_REV);
    setup_motor_pin(RIGHT_FWD);
    setup_motor_pin(RIGHT_REV);

    // Start HTTP server
    start_http_server();

    // Main loop — lwIP needs polling
    while (true) {
        cyw43_arch_poll();
        sleep_ms(1);
    }

    cyw43_arch_deinit();
    return 0;
}
```

## Try it
- Change the Wi-Fi credentials and connect — note the IP address printed in the console
- Open the IP address in your phone's browser and drive the robot with the virtual joystick
- Try changing the joystick sensitivity by scaling the X/Y values
- Open the page on multiple devices at once — what happens when two people drive?

## Challenge

Add a **speed limit slider** to the HTML page. Use an `<input type="range">` element that scales all motor values from 0% to 100%. This lets careful drivers go slow while experienced drivers can go full speed. Send the max speed as a parameter and clamp motor values on the Pico side.

## Summary

The Pico 2 W's built-in Wi-Fi turns our robot into a tiny web server. We serve a complete HTML page with a touch-friendly virtual joystick — no app installation needed. The joystick sends X/Y coordinates via HTTP, which the Pico maps to differential drive motor speeds. This is the most accessible control method since anyone with a phone and a browser can drive the robot.

## How this fits the robot

Wi-Fi control is a step up from Bluetooth — it works from further away and needs no special app. It's another mode in our state machine. But more importantly, the web server foundation we built here is reused in Project 19 for the telemetry dashboard. The robot isn't just controllable over Wi-Fi — it's observable too.
