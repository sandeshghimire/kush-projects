# Lesson 26: Seven-Color Flash LED — The Party Light That Does It Itself!

## 🎯 What You'll Learn
- Why some LEDs cycle through colors automatically without any code
- What a self-contained LED module means
- How to turn the LED on and off using a signal pin
- How to synchronize the flashing with other things (like a buzzer!)
- Why "automatic" components are incredibly useful in projects

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Seven-Color Flash LED Module from Elegoo kit
- Active Buzzer Module (optional, for sync effects)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Most LEDs need you to write code to make them change colors. But the Seven-Color Flash LED Module is different — it is a **smarty-pants LED**! Inside this tiny module there is a built-in microchip that automatically cycles through seven different colors: red, orange, yellow, green, cyan, blue, and purple. All by itself! You do not write a single line of color-changing code. Just give it power and it starts its rainbow light show immediately!

Think of it like a music box. When you wind up a music box and open the lid, it plays its tune automatically — you do not have to press buttons or flip switches. The Seven-Color Flash LED is the same idea. The little chip inside it is pre-programmed from the factory to cycle through all the colors. It is showing off and it does not need your help to do it!

So what is your job in this lesson? You control the ON/OFF switch! The signal pin lets you turn the automatic light show on or off from your code. You can make it flash on for 2 seconds, off for 1 second, on for 2 seconds, and so on. Or you can turn it on when a button is pressed. Or synchronize it with a buzzer for a real party effect! The LED does the hard work of cycling colors — you control when the party starts and stops. That is a great team!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal) | HIGH = LED on and cycling, LOW = LED off |
| 3V3 | VCC | Power |
| GND | GND | Ground |

> **Note:** Some versions of this module auto-cycle when VCC is connected. The signal pin may simply control power to the module. Either way, GP15 HIGH = on!

---

## 💻 The Code

```c
/**
 * Lesson 26: Seven-Color Flash LED Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * This LED cycles through 7 colors AUTOMATICALLY!
 * We do not need to write any color code.
 * Our job: control when it is ON and create cool patterns.
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK library

// Signal pin for the seven-color LED
#define LED_PIN    15   // GP15 — HIGH turns the LED on
#define BUZZER_PIN 16   // GP16 — optional buzzer for sync

// Helper function: turn LED on
void led_on() {
    gpio_put(LED_PIN, 1);   // HIGH signal = LED module active
}

// Helper function: turn LED off
void led_off() {
    gpio_put(LED_PIN, 0);   // LOW signal = LED module off
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 26: Seven-Color Flash LED ===\n");
    printf("Watch the rainbow light show!\n\n");

    // Set up the LED signal pin as output
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);   // Output mode
    gpio_put(LED_PIN, 0);              // Start with LED off

    // Set up the buzzer pin as output (optional)
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);   // Buzzer off

    // ---- Pattern 1: Simple on/off ----
    printf("Pattern 1: Simple on and off\n");
    for (int i = 0; i < 5; i++) {   // Repeat 5 times
        led_on();
        printf("  LED ON\n");
        sleep_ms(2000);   // On for 2 seconds
        led_off();
        printf("  LED OFF\n");
        sleep_ms(1000);   // Off for 1 second
    }

    // ---- Pattern 2: Fast strobe effect ----
    printf("\nPattern 2: Fast strobe!\n");
    for (int i = 0; i < 20; i++) {  // Flash 20 times quickly
        led_on();
        sleep_ms(100);   // On for 100ms
        led_off();
        sleep_ms(100);   // Off for 100ms
    }
    sleep_ms(500);   // Pause after strobe

    // ---- Pattern 3: Buzzer sync (party time!) ----
    printf("\nPattern 3: LED and buzzer in sync!\n");
    for (int i = 0; i < 6; i++) {   // 6 beats
        // Beat on: both LED and buzzer activate together
        led_on();
        gpio_put(BUZZER_PIN, 1);
        sleep_ms(300);               // Beat lasts 300ms

        // Beat off: both go quiet
        led_off();
        gpio_put(BUZZER_PIN, 0);
        sleep_ms(300);               // Gap between beats
    }
    sleep_ms(500);

    // ---- Pattern 4: SOS pattern ----
    printf("\nPattern 4: SOS in light! (... --- ...)\n");
    // S = dot dot dot (short short short)
    for (int i = 0; i < 3; i++) {
        led_on();  sleep_ms(200);   // Short flash
        led_off(); sleep_ms(200);
    }
    sleep_ms(400);   // Gap between letters
    // O = dash dash dash (long long long)
    for (int i = 0; i < 3; i++) {
        led_on();  sleep_ms(600);   // Long flash
        led_off(); sleep_ms(200);
    }
    sleep_ms(400);   // Gap between letters
    // S = dot dot dot again
    for (int i = 0; i < 3; i++) {
        led_on();  sleep_ms(200);
        led_off(); sleep_ms(200);
    }
    sleep_ms(1000);

    // ---- Pattern 5: Heartbeat ----
    printf("\nPattern 5: Heartbeat thump-thump!\n");
    for (int i = 0; i < 8; i++) {   // 8 heartbeats
        led_on();  sleep_ms(100);   // First thump
        led_off(); sleep_ms(100);
        led_on();  sleep_ms(100);   // Second thump (closer together)
        led_off(); sleep_ms(600);   // Longer pause between beats
    }

    // ---- Main loop: continuous slow cycle ----
    printf("\nNow: slow gentle cycle. Enjoy the light show!\n");
    while (true) {
        led_on();
        sleep_ms(3000);   // On for 3 seconds (watch the colors change!)
        led_off();
        sleep_ms(1000);   // Off for 1 second
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **No color code needed!** The LED module has a tiny chip inside that handles all the color cycling automatically. We only send HIGH/LOW to the signal pin to turn the whole show on or off.

2. **Helper functions:** `led_on()` and `led_off()` are tiny functions that just call `gpio_put()`. They make the main code much easier to read — `led_on()` is clearer than `gpio_put(LED_PIN, 1)`.

3. **Pattern with `for` loops:** Each pattern uses a `for` loop to repeat a basic on/off sequence. Changing the number in `i < 20` changes how many times it repeats.

4. **Buzzer sync:** In Pattern 3, we turn on BOTH the LED and buzzer at the same time, then turn both off. This creates a synchronized light-and-sound effect — like a club light show!

5. **Heartbeat pattern:** The heartbeat uses two quick pulses close together (thump-thump) then a longer pause. This mimics a real heartbeat rhythm!

---

## 🎮 Try It!

1. **Slow watch:** Turn the LED on for 10 seconds and watch it cycle through all 7 colors. Can you count them all?

2. **Color catch:** Try to turn the LED off at the exact moment it shows your favorite color!

3. **Beat sync:** Add a faster buzzer beat. Does the light show feel more exciting with sound?

4. **Morse code name:** Can you flash your name in Morse code using the seven-color LED?

---

## 🏆 Challenge

Build an **alarm clock light!** Use `to_ms_since_boot()` to track time. For the first 10 seconds, keep the LED off. Then turn it on with a dramatic pattern (fast strobe for 3 seconds, then gentle pulse forever). This simulates a sunrise alarm clock that slowly wakes you up with light instead of a loud buzzer. Add a buzzer that quietly beeps 3 times when the alarm starts!

---

## 📝 Summary

The Seven-Color Flash LED module is special because it cycles through seven colors completely automatically — the factory programmed a tiny chip inside it to do the color work for you. Your job is simply to control when it is ON or OFF using the signal pin. This makes it incredibly easy to add a dazzling light show to any project without writing a single line of color mixing code!
