# Meet the Pico 2 W & Your First Blink

## What you'll learn
- What the Raspberry Pi Pico 2 W is and what makes it special
- How to install the C/C++ SDK toolchain on your computer
- How to load programs onto the Pico using UF2 drag-and-drop
- How to blink the onboard LED using C code
- How to wire and blink an external LED on a breadboard

## Parts you'll need
- Raspberry Pi Pico 2 W (~$6) — the **W** stands for wireless!
- USB-C cable (~$5)
- Breadboard (~$5)
- 1× LED (any colour) (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 2× jumper wires (~$0.20)

## Background

Imagine you have a tiny brain the size of a postage stamp. That's basically what the Raspberry Pi Pico 2 W is! It's a **microcontroller** — a small computer built onto a single chip called the **RP2350**. Inside that chip are two processors that can run 150 million instructions every single second. That's fast enough to control a robot, read a dozen sensors, and still have time to blink an LED — all at once!

The **W** in Pico 2 W is really exciting: it means this board has **Wi-Fi built in**. One day you'll use it to post sensor data to the internet, control your robot from a phone, or even build your own tiny web server. You won't need that today, but just knowing it's there is pretty cool. For now, we're going to start simple: we're going to make a light blink!

Unlike a regular computer, the Pico doesn't have a screen or a keyboard. Instead, it has **GPIO pins** — 26 tiny metal legs that can send and receive electrical signals. You'll use these pins to control LEDs, read buttons, spin motors, and talk to sensors. Think of each GPIO pin as a tiny light switch that you can flip on and off from your code. The onboard LED is already connected to one of those pins — **GPIO 25** (which the SDK calls `PICO_DEFAULT_LED_PIN`) — so you can blink it without wiring anything at all.

Before we can tell the Pico what to do, we need to write our instructions in the **C programming language**, compile them into a `.uf2` file, and drag that file onto the Pico. When you hold the **BOOTSEL** button and plug in the USB cable, the Pico shows up on your computer just like a USB thumb drive. Drop the `.uf2` file onto it, wait one second, and the Pico reboots and starts running your code instantly. No special programmer or cable needed — just drag and drop!

## Wiring

**Onboard LED** — no wiring needed! It's built into the board on GPIO 25. We get that for free.

**External LED** (the one you add yourself):

| Pico Pin | Component |
|----------|-----------|
| GP15 | 330Ω resistor → LED long leg (anode) |
| GND  | LED short leg (cathode) |

Plug the 330Ω resistor into the breadboard. Connect one end to GP15 and the other end to the long leg of the LED. Connect the short leg of the LED to any GND pin on the Pico. The resistor is like a tiny speed bump — it stops too much electricity from rushing through the LED and burning it out.

## The code

```c
#include "pico/stdlib.h"

// -----------------------------------------------
// Lesson 1: Blink the onboard LED and an external
// LED on GP15. The onboard LED is your proof that
// the Pico is alive — like a heartbeat!
// -----------------------------------------------

#define EXTERNAL_LED_PIN 15   // The LED we wired on the breadboard

int main() {
    // Tell the Pico we want to use the onboard LED pin
    gpio_init(PICO_DEFAULT_LED_PIN);
    gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);  // Set it as an OUTPUT

    // Tell the Pico we want to use GP15 for our external LED
    gpio_init(EXTERNAL_LED_PIN);
    gpio_set_dir(EXTERNAL_LED_PIN, GPIO_OUT);       // Output too!

    while (true) {   // Loop forever — microcontrollers never stop!

        // --- Flash the onboard LED ---
        gpio_put(PICO_DEFAULT_LED_PIN, 1);   // Turn ON  (3.3V)
        sleep_ms(500);                        // Wait half a second
        gpio_put(PICO_DEFAULT_LED_PIN, 0);   // Turn OFF (0V)
        sleep_ms(500);                        // Wait half a second

        // --- Now flash the external LED on the breadboard ---
        gpio_put(EXTERNAL_LED_PIN, 1);       // External LED ON
        sleep_ms(300);                        // A bit quicker this time
        gpio_put(EXTERNAL_LED_PIN, 0);       // External LED OFF
        sleep_ms(300);
    }

    return 0;  // We never actually reach this line, but it's good manners to have it
}
```

### How the code works

1. **`#include "pico/stdlib.h"`** — This line brings in the Pico SDK library, like opening a toolbox full of useful functions. Without it, nothing works!
2. **`gpio_init(pin)`** — Wakes up that GPIO pin and gets it ready to use. Always do this first.
3. **`gpio_set_dir(pin, GPIO_OUT)`** — Tells the Pico which direction signals flow. `GPIO_OUT` means the Pico is *sending* a signal (good for LEDs). Later you'll use `GPIO_IN` for buttons.
4. **`gpio_put(pin, 1)`** — Sets the pin HIGH, meaning 3.3 volts comes out. That pushes electricity through the LED and it lights up!
5. **`gpio_put(pin, 0)`** — Sets the pin LOW (0 volts). No electricity, no light.
6. **`sleep_ms(500)`** — Pauses the program for 500 milliseconds. There are 1000 milliseconds in a second, so 500ms is half a second.
7. **`while (true)`** — This loop runs forever. Microcontrollers don't quit — they keep running until you unplug them!

## Try it

1. **Change the speed** — Try `sleep_ms(100)` for a super-fast blink, or `sleep_ms(2000)` for a slow, lazy blink. What's the fastest blink where you can still see it flicker?
2. **Alternate** — Make the onboard LED turn ON when the external one turns OFF, and vice versa. They should take turns like two kids on a seesaw.
3. **Heartbeat** — Make it pulse like a heartbeat: two quick flashes, then a longer pause. Try `sleep_ms(100)`, off `100`, on `100`, off `600` and repeat.
4. **Slow fade trick** — You can't truly fade with just on/off, but try very quick blinks with different on-vs-off times. Does it *look* dimmer?

## Challenge

Write a program that blinks the external LED in a pattern that spells your name in **Morse code**. Look up the Morse code alphabet online — dots are short flashes (`sleep_ms(200)`) and dashes are long flashes (`sleep_ms(600)`). Leave a pause between letters (`sleep_ms(400)`) and a longer pause between words (`sleep_ms(800)`). If your name is long, just do the first three letters!

## Summary

You set up your Pico 2 W development environment, learned how to load programs using BOOTSEL and UF2 drag-and-drop, and wrote your very first C program. You used `gpio_init`, `gpio_set_dir`, and `gpio_put` to control GPIO pins — making both the onboard LED and an external LED blink on and off. The Pico 2 W also has Wi-Fi built in, which you'll explore in a later lesson. Every single Pico project you build from here on starts with these same building blocks!
