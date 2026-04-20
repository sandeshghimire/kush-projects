# Button Switch Module — Your First Input

## What you'll learn
- How to read a button press using GPIO input pins
- Why the Elegoo Button Switch Module is easier than wiring a bare button
- What "debouncing" means and why buttons need it
- How to toggle an LED on and off with each button press
- The difference between a module's built-in pull-up and the Pico's internal pull-up

## Parts you'll need
- Raspberry Pi Pico 2 W (~$6)
- Elegoo 37 Sensor Kit — **Button Switch Module** (~$0.50, included in kit)
- 3× jumper wires (~$0.30)

## Background

So far you've only sent signals *out* from the Pico. Now it's time to receive signals *in*! A button is the simplest input device in the world — press it and it makes a connection, release it and the connection breaks. It's like a light switch, but smaller and springier.

The Elegoo Button Switch Module makes things really easy. It has three pins labeled **S** (Signal), **VCC** (power), and **GND** (ground), and it has a **built-in resistor** that keeps the signal pin stable when the button isn't pressed. When the button is NOT pressed, the signal pin sits quietly at LOW (0V). When you press the button, it jumps to HIGH (3.3V). That's nice and simple — HIGH means pressed, LOW means not pressed. (Bare buttons without a module work the opposite way, which can be confusing at first!)

Here's a sneaky problem you need to know about: **button bounce**. When you press a button, the metal contacts inside don't make one clean connection. They actually bounce against each other several times in the first few milliseconds, like a ball bouncing before it settles still. The Pico is so fast it reads those bounces as dozens of separate presses! Imagine pressing a door bell once and hearing it ring 50 times — that's what bounce feels like to your code.

The fix is called **software debouncing**. When we first detect the button going HIGH, we wait about 20 milliseconds (not long at all!) and then read it again. If it's still HIGH after that short pause, the bouncing has settled and it's a real press. If the pin changed back to LOW, it was just noise — we ignore it. Simple but very effective!

## Wiring

| Pico Pin | Button Switch Module Pin |
|----------|--------------------------|
| GP14 | S (Signal) |
| 3V3 | VCC |
| GND | GND |

The module has only three pins and they're usually labeled right on the board. Plug it into your breadboard (or connect it directly with jumper wires). Signal to GP14, VCC to 3V3, GND to GND. That's it — no resistors to add, no pull-ups to enable on the Pico side. The module handles it all!

The onboard LED (already on the board at `PICO_DEFAULT_LED_PIN`, GPIO 25) will be our output, so no extra LED wiring needed for the basic version.

## The code

```c
#include "pico/stdlib.h"
#include <stdbool.h>

// -----------------------------------------------
// Lesson 3: Button Switch Module — Your First Input
// Press the button to toggle the onboard LED!
// -----------------------------------------------

#define BUTTON_PIN    14   // S pin of the Button Switch Module
#define LED_PIN       PICO_DEFAULT_LED_PIN   // Onboard LED on GPIO 25
#define DEBOUNCE_MS   20   // Wait 20ms after first press before checking again

int main() {

    // Set up the button pin as an INPUT
    // (the module has its own pull-down, so we don't need gpio_pull_up here)
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);

    // Set up the onboard LED as an OUTPUT
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    bool led_state   = false;  // Is the LED currently on or off?
    bool last_button = false;  // Was the button pressed last time we checked?

    while (true) {

        // Read the current state of the button
        // The module outputs HIGH (true) when pressed, LOW (false) when not pressed
        bool current_button = gpio_get(BUTTON_PIN);

        // Detect a RISING EDGE — the moment the button changes from LOW to HIGH
        // That's the exact moment someone presses it down!
        if (!last_button && current_button) {

            // Wait for the bounce to settle down
            sleep_ms(DEBOUNCE_MS);

            // Read the button again — is it STILL pressed?
            current_button = gpio_get(BUTTON_PIN);

            if (current_button) {    // Yes, still pressed — it's a real button press!
                led_state = !led_state;             // Flip the LED state (on→off or off→on)
                gpio_put(LED_PIN, led_state ? 1 : 0);   // Update the LED
            }
        }

        // Remember what the button was doing this loop, so next loop
        // we can tell if it just changed state
        last_button = current_button;

        sleep_ms(1);   // Tiny pause to avoid working too hard for no reason
    }

    return 0;
}
```

### How the code works

1. **`gpio_set_dir(BUTTON_PIN, GPIO_IN)`** — This tells the Pico the button pin is an INPUT (receiving signals), not an output. You're listening, not talking.
2. **`gpio_get(BUTTON_PIN)`** — Reads the current voltage on the pin. Returns `true` (1) if the pin is HIGH (button pressed), `false` (0) if LOW (button not pressed).
3. **Rising edge detection** — We compare `last_button` (what it was before) with `current_button` (what it is now). `!last_button && current_button` means "it was LOW and now it's HIGH" — the exact moment of a fresh press.
4. **`sleep_ms(DEBOUNCE_MS)`** — We wait 20 milliseconds for the bouncing contacts to settle down, then read the button one more time.
5. **`led_state = !led_state`** — The `!` flips a boolean. If `led_state` was `true` (LED on), it becomes `false` (LED off). If it was `false`, it becomes `true`. This is how we toggle!
6. **`last_button = current_button`** — We save what the button was doing this loop so we can detect a change next loop. Without this, we couldn't spot the rising edge.

## Try it

1. **Count your presses** — Add a variable called `press_count` and add 1 to it every time the button is pressed. Then blink the LED that many times in a row. (You'll need a second `while` loop inside the button-press block!)
2. **Hold vs tap** — If the button is held for more than 1 second, make the LED blink fast. If it's just tapped quickly, just toggle it once.
3. **Double click** — Only toggle the LED if the button is pressed twice within 500ms. If you press it once and wait longer than 500ms, nothing happens.
4. **Morse code input** — Make short presses print a dot and long presses (held > 400ms) print a dash. Watch the output on your serial console!

## Challenge

Wire up the **Dual-Color LED Module** from your Elegoo kit (it has a red LED and a green LED in one package, with pins R, G, and GND). Connect R to GP10, G to GP11, GND to GND. Now program it so:
- Pressing the button once switches from green to red
- Pressing it again switches from red to green
- It starts on green (safe!) and switches to red (warning!) each press

This is like a simple traffic light controlled entirely by your button!

## Summary

You learned to read digital input signals from the Elegoo Button Switch Module using `gpio_get`, which outputs HIGH when pressed and LOW when released (thanks to its built-in resistor). Detecting a rising edge — the change from LOW to HIGH — lets you respond to the exact moment a button is pressed rather than checking it continuously. Software debouncing makes your readings reliable by waiting 20ms for the bouncy contacts to settle. These input-reading skills are the foundation for every interactive project you'll ever build!
