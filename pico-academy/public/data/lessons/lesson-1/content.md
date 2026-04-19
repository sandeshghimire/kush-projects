# Meet the Pico 2 & Your First Blink

## What you'll learn
- What the Raspberry Pi Pico 2 is and what makes it special
- How to install the C/C++ SDK toolchain on your computer
- How to load programs onto the Pico using UF2 drag-and-drop
- How to blink the onboard LED using C code
- How to wire and blink an external LED on a breadboard

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- USB-C cable (~$5)
- Breadboard (~$5)
- 1× LED (any colour) (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 2× jumper wires (~$0.20)

## Background

Imagine you have a tiny brain the size of a postage stamp. That's basically what the Raspberry Pi Pico 2 is! It's a **microcontroller** — a small computer built onto a single chip called the **RP2350**. Inside that chip are two processors (called ARM Cortex-M33 cores) that can run 150 million instructions every single second. That's fast enough to control a robot!

Unlike a regular computer, the Pico doesn't have a screen or a keyboard. Instead, it has **GPIO pins** — 26 tiny metal legs that can send and receive electrical signals. You'll use these pins to control LEDs, read buttons, spin motors, and talk to sensors. Think of each GPIO pin as a tiny light switch you can flip on and off from your code.

Before we can tell the Pico what to do, we need to write our instructions in the C programming language, compile them into a `.uf2` file, and drag that file onto the Pico. When you hold the **BOOTSEL** button and plug in the USB cable, the Pico shows up on your computer as a USB drive. Drop the `.uf2` file on it, and the Pico reboots and starts running your code instantly!

The onboard LED is connected to **GPIO 25** (sometimes called `PICO_DEFAULT_LED_PIN`). It's already wired up for you — no breadboard needed. Once we blink that one, we'll add an external LED on **GP15** with a 330Ω resistor to protect it from too much current.

## Wiring

**Onboard LED** — no wiring needed! It's built into the board on GPIO 25.

**External LED:**
| Pico Pin | Component |
|----------|-----------|
| GP15 | LED anode (long leg) through 330Ω resistor |
| GND  | LED cathode (short leg) |

Connect a 330Ω resistor from GP15 to the long leg of the LED. Connect the short leg directly to any GND pin on the Pico.

## The code

```c
#include "pico/stdlib.h"

// Blink the onboard LED, then blink an external LED on GP15

#define EXTERNAL_LED_PIN 15

int main() {
    // Initialize the onboard LED
    gpio_init(PICO_DEFAULT_LED_PIN);
    gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);

    // Initialize the external LED on GP15
    gpio_init(EXTERNAL_LED_PIN);
    gpio_set_dir(EXTERNAL_LED_PIN, GPIO_OUT);

    while (true) {
        // Blink onboard LED
        gpio_put(PICO_DEFAULT_LED_PIN, 1);
        sleep_ms(500);
        gpio_put(PICO_DEFAULT_LED_PIN, 0);
        sleep_ms(500);

        // Blink external LED
        gpio_put(EXTERNAL_LED_PIN, 1);
        sleep_ms(300);
        gpio_put(EXTERNAL_LED_PIN, 0);
        sleep_ms(300);
    }

    return 0;  // We never reach here, but it's good practice
}
```

### How the code works

1. `gpio_init()` tells the Pico to activate that pin.
2. `gpio_set_dir()` sets whether the pin is an **output** (sending signals) or an **input** (receiving signals). We want output.
3. `gpio_put()` sets the pin **HIGH** (1 = on, 3.3V) or **LOW** (0 = off, 0V).
4. `sleep_ms()` pauses for a number of milliseconds. 500 ms = half a second.

## Try it

1. **Change the speed** — Try `sleep_ms(100)` for a fast blink or `sleep_ms(1000)` for a slow one.
2. **Alternating blink** — Make the onboard LED turn on when the external one turns off, and vice versa.
3. **SOS pattern** — Blink out the Morse code SOS pattern: three short, three long, three short.
4. **Custom rhythm** — Create your own blink pattern like a heartbeat (quick-quick-pause).

## Challenge

Write a program that blinks the external LED in a pattern that spells out your name in Morse code. You'll need to look up the Morse code alphabet and use different `sleep_ms` values for dots (short) and dashes (long).

## Summary

You set up your Pico 2 development environment, learned how to load programs using BOOTSEL and UF2 drag-and-drop, and wrote your very first C program. You used `gpio_init`, `gpio_set_dir`, and `gpio_put` to control GPIO pins, making both the onboard LED and an external LED blink on and off. Every Pico project you build from here starts with these same building blocks!
