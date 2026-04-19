# UART / Serial — Printing and Debugging

## What you'll learn
- What UART serial communication is and how it works
- How to print debug messages from the Pico to your computer
- How to set up stdio over USB and hardware UART
- How to send and receive text data between devices
- How to use printf for debugging your programs

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- USB-C cable (~$5)
- No additional parts needed for USB serial
- Optional: USB-to-UART adapter for hardware UART (~$5)

## Background

When your program isn't working, how do you figure out what's going wrong? On a regular computer you'd look at the screen, but the Pico doesn't have one. The answer is **serial communication** — sending text messages from the Pico through the USB cable to your computer, where you can read them in a terminal program.

**UART** stands for Universal Asynchronous Receiver/Transmitter. It's one of the oldest and simplest ways for two devices to talk to each other. Think of it like passing notes in class — one device writes a message one character at a time, and the other device reads it. They agree on a speed (called the **baud rate**) so they know how fast to send and receive characters.

The Pico 2 has two UART peripherals (UART0 and UART1), but the easiest way to get debug messages is over **USB**. When you call `stdio_init_all()`, the Pico sets up a virtual serial port over USB. Your computer sees it as a COM port (Windows) or `/dev/ttyACM0` (Linux/Mac). Open a serial terminal at 115200 baud and you'll see everything your Pico `printf`s!

For talking to other devices (like a Bluetooth module or GPS), you use the hardware UART pins. UART0 defaults to GP0 (TX) and GP1 (RX). Two wires are all you need: TX on one device connects to RX on the other, and vice versa. Both devices must use the same baud rate, or the messages come out as gibberish.

## Wiring

**USB serial** — No wiring needed! Just plug in the USB cable.

**Hardware UART0** (optional, for device-to-device):
| Pico Pin | Connection |
|----------|------------|
| GP0 (UART0 TX) | Other device's RX |
| GP1 (UART0 RX) | Other device's TX |
| GND | Other device's GND |

Always connect GND between devices — they need a common reference voltage.

## The code

```c
#include "pico/stdlib.h"
#include "hardware/uart.h"
#include <stdio.h>

#define UART_ID    uart0
#define BAUD_RATE  115200
#define UART_TX_PIN 0
#define UART_RX_PIN 1

int main() {
    // Initialize USB serial (for printf debugging)
    stdio_init_all();

    // Initialize hardware UART0
    uart_init(UART_ID, BAUD_RATE);
    gpio_set_function(UART_TX_PIN, GPIO_FUNC_UART);
    gpio_set_function(UART_RX_PIN, GPIO_FUNC_UART);

    // Set UART format: 8 data bits, 1 stop bit, no parity
    uart_set_format(UART_ID, 8, 1, UART_PARITY_NONE);

    sleep_ms(2000);  // Wait for serial terminal to connect

    printf("Hello from Pico 2! USB serial is working.\n");
    uart_puts(UART_ID, "Hello from UART0!\r\n");

    int counter = 0;

    while (true) {
        // Print debug info over USB serial
        printf("Loop iteration: %d\n", counter);

        // Send data over hardware UART
        char buf[64];
        snprintf(buf, sizeof(buf), "Count: %d\r\n", counter);
        uart_puts(UART_ID, buf);

        // Check if any data arrived on hardware UART
        while (uart_is_readable(UART_ID)) {
            char ch = uart_getc(UART_ID);
            printf("Received on UART: '%c' (0x%02X)\n", ch, ch);
        }

        counter++;
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. `stdio_init_all()` enables USB serial so `printf` sends text to your computer.
2. `uart_init(uart0, 115200)` configures hardware UART0 at 115200 baud.
3. `gpio_set_function()` switches GP0 and GP1 from plain GPIO to UART mode.
4. `uart_puts()` sends a string over the hardware UART.
5. `uart_is_readable()` checks if any characters have arrived, and `uart_getc()` reads one character.
6. `snprintf()` safely formats a string into a buffer — always use it instead of `sprintf` to prevent buffer overflow.

## Try it

1. **Sensor logger** — Combine with Lesson 5 to print ADC readings over serial every second.
2. **Echo test** — Read characters from UART and echo them back with modification (uppercase them).
3. **Command parser** — Send single-character commands from your terminal: 'r' to blink red, 'g' for green, 'b' for blue.
4. **Timestamp** — Use `time_us_64()` to print timestamps alongside your debug messages.

## Challenge

Build a serial command interpreter that accepts text commands like `LED ON`, `LED OFF`, `BLINK 500`. Parse the incoming characters into words and execute the appropriate action. Handle unknown commands gracefully with an error message.

## Summary

UART serial communication is your most important debugging tool. `stdio_init_all()` with `printf` gives you instant debug output over USB. Hardware UART on GP0/GP1 lets you talk to other devices. Always match baud rates between devices, connect GND wires, and use `snprintf` for safe string formatting. You'll use serial debugging in every project from here on!
