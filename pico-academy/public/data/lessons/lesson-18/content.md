# Wi-Fi on the Pico 2 W

## What you'll learn
- How to connect the Pico 2 W to a Wi-Fi network
- How to use the CYW43 wireless chip and lwIP networking stack
- How to create a simple HTTP web server on the Pico
- How to make HTTP requests to send data
- Security basics for network-connected devices

## Parts you'll need
- Raspberry Pi Pico 2 **W** (with wireless) (~$6)
- USB-C cable (~$5)
- No additional parts needed — Wi-Fi is built in!

## Background

The Pico 2 **W** has a superpower the regular Pico 2 doesn't: a **CYW43439** wireless chip that provides both Wi-Fi and Bluetooth. This means your robot can connect to your home network, serve web pages, send sensor data to the cloud, or be controlled from your phone!

Think of Wi-Fi like a walkie-talkie that speaks a very precise language. Your Pico connects to your router (like joining a radio channel), gets an **IP address** (its phone number on the network), and then can send and receive data using **TCP/IP** — the same protocol that powers the entire internet.

The Pico SDK includes **lwIP** (lightweight IP), a networking stack designed for microcontrollers. It handles all the complex networking details: TCP connections, UDP packets, DHCP (getting an IP address), and DNS (looking up website addresses). You just call simple functions and lwIP does the heavy lifting.

We'll build a tiny **HTTP web server** that serves a simple status page. Anyone on your network can open a browser, type the Pico's IP address, and see real-time data from your robot. It's like giving your robot its own little website!

**Important security note**: Never hardcode real Wi-Fi passwords in code that gets shared. Use environment variables or a config file that's excluded from version control.

## Wiring

No wiring needed for this lesson — Wi-Fi is built into the Pico 2 W board!

## The code

```c
#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "lwip/tcp.h"
#include "lwip/apps/httpd.h"
#include <stdio.h>
#include <string.h>

// Wi-Fi credentials — store these securely in production!
#define WIFI_SSID "YourNetworkName"
#define WIFI_PASS "YourPassword"

// Simple HTTP response
const char http_response[] =
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: text/html\r\n"
    "Connection: close\r\n"
    "\r\n"
    "<!DOCTYPE html>"
    "<html><head><title>Pico Robot</title>"
    "<style>body{font-family:sans-serif;text-align:center;padding:40px;}"
    "h1{color:#2563eb;}</style></head>"
    "<body><h1>Pico 2 W Robot</h1>"
    "<p>Status: Online</p>"
    "<p>Uptime: %d seconds</p>"
    "</body></html>";

// TCP connection callback — handle incoming HTTP requests
static err_t tcp_recv_callback(void *arg, struct tcp_pcb *tpcb,
                                struct pbuf *p, err_t err) {
    if (p == NULL) {
        // Client closed connection
        tcp_close(tpcb);
        return ERR_OK;
    }

    // Build response with uptime
    char response[1024];
    int uptime = to_ms_since_boot(get_absolute_time()) / 1000;
    snprintf(response, sizeof(response), http_response, uptime);

    // Send response
    tcp_write(tpcb, response, strlen(response), TCP_WRITE_FLAG_COPY);
    tcp_output(tpcb);

    // Free the received buffer and close
    pbuf_free(p);
    tcp_close(tpcb);

    return ERR_OK;
}

// Accept new TCP connections
static err_t tcp_accept_callback(void *arg, struct tcp_pcb *newpcb, err_t err) {
    tcp_recv(newpcb, tcp_recv_callback);
    return ERR_OK;
}

// Start the web server on port 80
void start_http_server(void) {
    struct tcp_pcb *pcb = tcp_new();
    tcp_bind(pcb, IP_ADDR_ANY, 80);
    pcb = tcp_listen(pcb);
    tcp_accept(pcb, tcp_accept_callback);
    printf("HTTP server listening on port 80\n");
}

int main() {
    stdio_init_all();
    sleep_ms(2000);
    printf("Pico 2 W Wi-Fi Demo\n");

    // Initialize the CYW43 wireless chip
    if (cyw43_arch_init()) {
        printf("Wi-Fi init failed!\n");
        return 1;
    }

    // Enable station mode (connect to an access point)
    cyw43_arch_enable_sta_mode();

    // Connect to Wi-Fi
    printf("Connecting to '%s'...\n", WIFI_SSID);
    int result = cyw43_arch_wifi_connect_timeout_ms(
        WIFI_SSID, WIFI_PASS,
        CYW43_AUTH_WPA2_AES_PSK,
        30000  // 30 second timeout
    );

    if (result != 0) {
        printf("Wi-Fi connection failed! Error: %d\n", result);
        return 1;
    }

    // Print our IP address
    printf("Connected!\n");
    printf("IP: %s\n", ip4addr_ntoa(
        netif_ip4_addr(netif_list)));

    // Start the web server
    start_http_server();

    // Blink the onboard LED to show we're running
    while (true) {
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1);
        sleep_ms(500);
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 0);
        sleep_ms(500);

        // Must call this regularly for lwIP to process packets
        cyw43_arch_poll();
    }

    cyw43_arch_deinit();
    return 0;
}
```

### How the code works

1. `cyw43_arch_init()` powers up the wireless chip. `cyw43_arch_enable_sta_mode()` sets it to station mode (client).
2. `cyw43_arch_wifi_connect_timeout_ms()` connects to your network with a 30-second timeout.
3. We create a TCP listener on port 80 (HTTP). When a browser connects, `tcp_accept_callback` fires, and `tcp_recv_callback` sends back an HTML page.
4. `cyw43_arch_poll()` must be called regularly so lwIP can process incoming and outgoing packets.
5. The onboard LED on the Pico W is controlled through the CYW43 chip, not a regular GPIO pin.

### CMakeLists.txt additions

```cmake
target_link_libraries(your_project
    pico_stdlib
    pico_cyw43_arch_lwip_poll
)
```

## Try it

1. **JSON API** — Change the response to JSON format: `{"status":"online","uptime":123}` and read it from a script.
2. **Sensor dashboard** — Add ADC readings or IMU data to the web page, with auto-refresh every 2 seconds.
3. **POST handler** — Parse incoming POST requests to receive commands like motor speed from a web form.

## Challenge

Build a simple REST API with two endpoints: `GET /status` returns sensor data as JSON, and `POST /motor` accepts speed values in the body. Use this as the foundation for remote-controlling your robot from a web browser.

## Summary

The Pico 2 W's CYW43 chip provides Wi-Fi connectivity. Using the lwIP networking stack, you can connect to networks, serve web pages, and build APIs. Your robot can report sensor data, receive commands, and be controlled from any browser. Always handle credentials securely and call `cyw43_arch_poll()` regularly for packet processing. Wi-Fi transforms your robot from a standalone machine into a networked device!
