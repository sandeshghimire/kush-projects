# Digital Outputs — Controlling LEDs

## What you'll learn
- How GPIO pins work as digital outputs
- How to control multiple LEDs independently
- How to create a traffic light pattern with timing
- How to use loops and arrays to manage many pins at once
- Why current-limiting resistors are essential

## Parts you'll need
- Raspberry Pi Pico 2 (~$5)
- Breadboard (~$5)
- 3× LEDs (red, yellow, green) (~$0.30)
- 3× 330Ω resistors (~$0.15)
- 4× jumper wires (~$0.40)

## Background

In the last lesson you blinked a single LED. Now imagine you're controlling a whole traffic light! Each light needs its own GPIO pin so you can turn them on and off independently. Think of it like having three separate light switches on a wall — flipping one doesn't affect the others.

A **digital output** can only be in one of two states: HIGH (3.3 volts, on) or LOW (0 volts, off). There's nothing in between — it's like a door that's either open or closed. That's why we call it "digital." The Pico 2 has 26 GPIO pins, so you could control 26 LEDs if you wanted!

Every LED needs a **current-limiting resistor** in series with it. LEDs are greedy — without a resistor, they'll try to gulp down way too much current and burn themselves out. A 330Ω resistor limits the current to about 10 milliamps, which is plenty bright but perfectly safe. It's like putting a speed limiter on a go-kart to keep things safe.

We'll wire our traffic light using GP15 (red), GP16 (yellow), and GP17 (green). These pins are right next to each other on the Pico, making the wiring nice and tidy.

## Wiring

| Pico Pin | Component |
|----------|-----------|
| GP15 | Red LED anode through 330Ω resistor |
| GP16 | Yellow LED anode through 330Ω resistor |
| GP17 | Green LED anode through 330Ω resistor |
| GND  | All LED cathodes (short legs) |

Each LED's long leg goes through a 330Ω resistor to its GPIO pin. All short legs connect to GND.

## The code

```c
#include "pico/stdlib.h"

#define RED_PIN    15
#define YELLOW_PIN 16
#define GREEN_PIN  17

// Helper to turn all lights off
void all_off(void) {
    gpio_put(RED_PIN, 0);
    gpio_put(YELLOW_PIN, 0);
    gpio_put(GREEN_PIN, 0);
}

int main() {
    // Initialize all three LED pins as outputs
    const uint led_pins[] = {RED_PIN, YELLOW_PIN, GREEN_PIN};
    for (int i = 0; i < 3; i++) {
        gpio_init(led_pins[i]);
        gpio_set_dir(led_pins[i], GPIO_OUT);
    }

    while (true) {
        // GREEN on for 5 seconds
        all_off();
        gpio_put(GREEN_PIN, 1);
        sleep_ms(5000);

        // YELLOW on for 2 seconds
        all_off();
        gpio_put(YELLOW_PIN, 1);
        sleep_ms(2000);

        // RED on for 5 seconds
        all_off();
        gpio_put(RED_PIN, 1);
        sleep_ms(5000);

        // RED + YELLOW on for 1 second (getting ready)
        gpio_put(YELLOW_PIN, 1);
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. We store all our pin numbers in an **array** and use a `for` loop to initialize them — this keeps code tidy when you have many pins.
2. The `all_off()` helper function turns every LED off before we light the next one. This prevents two lights being on at the same time by accident.
3. The traffic light cycle goes: Green → Yellow → Red → Red+Yellow → (back to Green).

## Try it

1. **Knight Rider** — Make the three LEDs light up in a sweeping pattern: left to right, then right to left, like the car from the TV show.
2. **Random blink** — Use a counter and modulo to create a pseudo-random blinking pattern.
3. **Speed up** — Start with slow transitions and gradually speed up each cycle.

## Challenge

Add a "pedestrian crossing" mode: when the traffic light is red, make the green LED flash rapidly 10 times to simulate a walk signal, then return to normal.

## Summary

You learned that each GPIO pin can independently drive an LED as a digital output, either HIGH (3.3V) or LOW (0V). By using arrays and helper functions, you can cleanly manage multiple pins. You built a complete traffic light that cycles through green, yellow, and red phases with proper timing.
