# Digital Inputs — Buttons and Debouncing

## What you'll learn
- How to read a button press using GPIO input pins
- What pull-up and pull-down resistors do and how to enable them
- Why buttons "bounce" and how to fix it with software debouncing
- How to toggle an LED on and off with each button press
- How to read multiple buttons independently

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- Breadboard (~$5)
- 2× tactile push buttons (~$0.20)
- 1× LED (~$0.10)
- 1× 330Ω resistor (~$0.05)
- 5× jumper wires (~$0.50)

## Background

So far you've only sent signals OUT from the Pico. Now it's time to receive signals IN! A push button is the simplest input device — press it and it makes a connection, release it and the connection breaks. But there's a sneaky problem you need to know about.

When a button isn't pressed, the GPIO pin is just floating in the air, not connected to anything. A floating pin picks up random electrical noise — like an antenna picking up radio stations you don't want. To fix this, we use a **pull-up resistor** that gently connects the pin to 3.3V when the button isn't pressed. The Pico has built-in pull-up and pull-down resistors you can activate with a single function call!

With a pull-up enabled, the pin reads HIGH (1) when the button is NOT pressed, and LOW (0) when the button IS pressed (because the button connects the pin to ground). It's backwards from what you might expect!

Here's the other tricky part: **bouncing**. When you press a button, the metal contacts inside don't make a clean single connection. They actually bounce several times in the first few milliseconds, like a ball bouncing before it settles. Your Pico is so fast it can read those bounces as dozens of separate presses! We fix this with **software debouncing** — we read the button, wait a short time (about 20ms), then read it again to make sure it's stable.

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP14 | Button A — one leg (other leg to GND) |
| GP15 | Button B — one leg (other leg to GND) |
| GP16 | LED anode through 330Ω resistor |
| GND  | Button A other leg, Button B other leg, LED cathode |

No external pull-up resistors needed — we'll enable the Pico's internal ones.

## The code

```c
#include "pico/stdlib.h"
#include <stdbool.h>

#define BUTTON_A_PIN  14
#define BUTTON_B_PIN  15
#define LED_PIN       16
#define DEBOUNCE_MS   20

int main() {
    stdio_init_all();

    // Set up LED as output
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    // Set up buttons as inputs with internal pull-ups
    gpio_init(BUTTON_A_PIN);
    gpio_set_dir(BUTTON_A_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_A_PIN);

    gpio_init(BUTTON_B_PIN);
    gpio_set_dir(BUTTON_B_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_B_PIN);

    bool led_on = false;
    bool last_a = true;  // Pull-up means HIGH when not pressed
    bool last_b = true;

    while (true) {
        // Read current button state (LOW = pressed with pull-up)
        bool current_a = gpio_get(BUTTON_A_PIN);
        bool current_b = gpio_get(BUTTON_B_PIN);

        // Button A: toggle the LED on falling edge
        if (last_a && !current_a) {
            sleep_ms(DEBOUNCE_MS);  // Wait for bouncing to settle
            current_a = gpio_get(BUTTON_A_PIN);
            if (!current_a) {       // Still pressed? It's real!
                led_on = !led_on;
                gpio_put(LED_PIN, led_on ? 1 : 0);
            }
        }

        // Button B: turn LED off immediately
        if (last_b && !current_b) {
            sleep_ms(DEBOUNCE_MS);
            current_b = gpio_get(BUTTON_B_PIN);
            if (!current_b) {
                led_on = false;
                gpio_put(LED_PIN, 0);
            }
        }

        last_a = current_a;
        last_b = current_b;

        sleep_ms(1);  // Small delay to avoid busy-spinning
    }

    return 0;
}
```

### How the code works

1. `gpio_pull_up()` enables the Pico's internal ~50kΩ pull-up resistor on each button pin.
2. `gpio_get()` reads the pin state: returns `true` (1) for HIGH, `false` (0) for LOW.
3. We detect a **falling edge** — when the pin changes from HIGH to LOW — which means the button was just pressed.
4. After detecting a press, we wait `DEBOUNCE_MS` milliseconds and read again. If the pin is still LOW, it's a real press, not a bounce.

## Try it

1. **Press counter** — Count how many times button A has been pressed and blink the LED that many times when button B is pressed.
2. **Hold detection** — Make the LED brightness vary based on how long the button is held (use a counter).
3. **Two-button combo** — Only turn the LED on when BOTH buttons are pressed at the same time.

## Challenge

Create a "Simon Says" memory game: the LED blinks a random pattern (using a counter as a seed), and the player must repeat it by pressing buttons A and B in the right order. Start with a sequence of 2 and increase each round.

## Summary

You learned to read digital inputs from buttons using `gpio_get`, configured internal pull-up resistors with `gpio_pull_up`, and implemented software debouncing to get clean, reliable button readings. Falling-edge detection lets you respond to the exact moment a button is pressed. These input-reading skills are essential for every interactive project you'll build!
