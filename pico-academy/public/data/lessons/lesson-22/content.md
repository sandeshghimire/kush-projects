# Lesson 22: Dual-Color LED Module — Two LEDs, One Module!

## 🎯 What You'll Learn
- How a dual-color LED works (red AND green in one package!)
- What "common cathode" means and why it matters
- How to turn each color on and off separately
- How to mix red and green to make yellow
- How to build a simple traffic light with just this one module!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Dual-Color LED Module from Elegoo kit (red + green, common cathode)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Imagine if you had two light bulbs glued back-to-back inside one tiny plastic bubble. That is basically what a dual-color LED is! It has a red LED and a green LED inside the same housing. You can turn on just red, just green, or BOTH at the same time. When both red and green LEDs are on together, you see YELLOW light! It is like mixing paint — red and green paint mixed together makes a yellow-ish color, and mixed light does the same thing!

The word **common cathode** sounds scary, but it just means both LEDs share the same ground (negative) wire. Think of it like two garden hoses that both drain into the same bucket at the bottom. The module has three pins: one for the red LED signal, one for the green LED signal, and one shared GND. Send power to the red pin and only red lights up. Send power to the green pin and only green lights up. Send power to BOTH and you get yellow!

This module is perfect for making traffic lights, status indicators, and notification lights. A green light could mean "all good!", yellow could mean "warning!", and red could mean "stop!" or "danger!". You will find dual-color LEDs in electronic devices everywhere — they are used to show charging status on phones, connection status on routers, and battery levels on toys. Now it is your turn to control one!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | R (Red signal) | Controls the red LED |
| GP16 | G (Green signal) | Controls the green LED |
| GND | GND (common cathode) | Shared ground for both LEDs |

> **Note:** Some modules label the pins differently. The GND pin is often the longest leg or marked with a minus symbol.

---

## 💻 The Code

```c
/**
 * Lesson 22: Dual-Color LED Module (Red + Green, Common Cathode)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * This module has two LEDs in one package!
 * Red + Green together = Yellow!
 * We'll make a fun traffic light sequence.
 */

#include <stdio.h>          // For printf() to print messages
#include "pico/stdlib.h"    // Main Pico SDK library

// Define which pins control which color
#define RED_PIN   15   // GP15 controls the red LED
#define GREEN_PIN 16   // GP16 controls the green LED

// Helper function to set both LED colors at once
// red = true means red ON, false means red OFF
// green = true means green ON, false means green OFF
void set_led(bool red, bool green) {
    gpio_put(RED_PIN,   red);    // Set red LED state
    gpio_put(GREEN_PIN, green);  // Set green LED state
}

int main() {
    stdio_init_all();   // Start USB serial for printing messages
    sleep_ms(2000);     // Wait 2 seconds for serial to connect

    printf("=== Lesson 22: Dual-Color LED Module ===\n");
    printf("Watch the LED change colors!\n\n");

    // Set up the red LED pin as output
    gpio_init(RED_PIN);
    gpio_set_dir(RED_PIN, GPIO_OUT);   // GP15 is an output pin
    gpio_put(RED_PIN, 0);              // Start with red LED off

    // Set up the green LED pin as output
    gpio_init(GREEN_PIN);
    gpio_set_dir(GREEN_PIN, GPIO_OUT); // GP16 is an output pin
    gpio_put(GREEN_PIN, 0);            // Start with green LED off

    while (true) {   // Loop forever

        // ---- RED LIGHT ----
        printf("RED light — Stop!\n");
        set_led(true, false);    // Red ON, Green OFF
        sleep_ms(3000);          // Hold for 3 seconds (like a real traffic light)

        // ---- YELLOW LIGHT (both on at same time!) ----
        printf("YELLOW light — Get ready...\n");
        set_led(true, true);     // Red ON, Green ON = YELLOW!
        sleep_ms(1500);          // Hold for 1.5 seconds

        // ---- GREEN LIGHT ----
        printf("GREEN light — Go!\n");
        set_led(false, true);    // Red OFF, Green ON
        sleep_ms(3000);          // Hold for 3 seconds

        // ---- OFF briefly ----
        printf("All off...\n");
        set_led(false, false);   // Both OFF
        sleep_ms(500);           // Quick pause before starting again

        // ---- BLINKING RED (emergency!) ----
        printf("FLASHING RED — Emergency!\n");
        for (int i = 0; i < 6; i++) {    // Flash 6 times
            set_led(true, false);         // Red ON
            sleep_ms(200);                // On for 200ms
            set_led(false, false);        // All OFF
            sleep_ms(200);                // Off for 200ms
        }

        // ---- ALTERNATING RED/GREEN (festive!) ----
        printf("Alternating — Red, Green, Red, Green!\n");
        for (int i = 0; i < 6; i++) {    // Alternate 6 times
            set_led(true, false);         // Red ON
            sleep_ms(300);
            set_led(false, true);         // Green ON
            sleep_ms(300);
        }

        printf("--- Restarting cycle ---\n\n");
        sleep_ms(500);   // Short pause before repeating
    }

    return 0;  // We never reach this line
}
```

---

## 🔍 How the Code Works

1. **Two output pins:** GP15 controls the red LED and GP16 controls the green LED. When you set a pin HIGH (1), that LED turns on. When you set it LOW (0), it turns off.

2. **The `set_led()` helper:** Instead of writing two `gpio_put()` lines every time, we made a helper function that sets both at once. This makes the code easier to read!

3. **Yellow = Red + Green:** Setting both pins HIGH at the same time turns on BOTH LEDs. Because red and green light mixed together looks yellow to our eyes, we get a yellow glow!

4. **Traffic light sequence:** The main loop goes through red (3s), yellow (1.5s), green (3s), then some fun patterns. This is exactly how a real traffic light works!

5. **The `for` loop:** `for (int i = 0; i < 6; i++)` repeats the code inside 6 times. It is like saying "do this thing 6 times in a row!" Perfect for blinking.

---

## 🎮 Try It!

1. **Traffic light:** Watch the traffic light sequence. Try changing the timing — make the green light longer and the red light shorter!

2. **Morse code:** Can you make the red LED blink your initial in Morse code? (Short blink = dot, long blink = dash)

3. **Status indicator:** Try making a "charging" pattern — solid red for a few seconds, then slow green blink to show "charged"!

4. **Disco mode:** Make both LEDs blink as fast as possible by setting `sleep_ms(50)`. What color do you see?

---

## 🏆 Challenge

Build a **pedestrian crossing button**! Start with green (traffic flowing). When you press a button on GP14, switch to yellow for 2 seconds, then red for 5 seconds (pedestrians cross!), then back to green. Make it so pressing the button only works when the light is green. Hint: use `gpio_get(14)` to read the button and an `if` statement to check if it is pressed!

---

## 📝 Summary

The dual-color LED module packs a red LED and a green LED into one tiny package with a shared GND pin (common cathode). You can control each color independently using separate GPIO pins, and turning both on at the same time makes yellow light — just like mixing colors! This simple module is the building block for traffic lights, status indicators, and notification lights in all kinds of projects.
