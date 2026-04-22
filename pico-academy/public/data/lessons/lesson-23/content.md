# Lesson 23: Reed Switch Module — The Invisible Door Detector!

## 🎯 What You'll Learn
- What a reed switch is and how it works
- How magnets can close an electrical circuit without touching anything
- How to read a digital signal (HIGH or LOW) from the reed switch
- How to detect when a door or lid is opened or closed
- How to build your own magnetic door alarm!

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- Reed Switch Module from Elegoo kit
- A small magnet (a fridge magnet works great!)
- Active Buzzer Module (optional, for the alarm)
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Imagine two thin metal strips inside a tiny glass tube. Usually they sit apart and do not touch. But bring a magnet close to the tube and — snap! — the magnetic field pulls the strips together and they touch. Now electricity can flow! Move the magnet away and the strips spring apart again. This is a **reed switch** — one of the neatest tricks in all of electronics!

Why is it called a "reed switch"? Because the metal strips look like the thin reeds that grow in ponds — long, thin, and flexible. The original switches were sealed inside glass to protect them. Modern reed switches are still tiny but are much tougher. The most important thing is: **no physical touching needed**. The magnet can be on the other side of a door, inside a cabinet, or hidden under a surface. The switch still works through the material. That is like having superpower vision that sees through walls!

Reed switches are used in real security systems on doors and windows. A small magnet is attached to the door and the reed switch is attached to the door frame. When the door is closed, the magnet holds the switch shut. When someone opens the door, the magnet moves away, the switch opens, and the alarm knows! Fridges use them too — the light turns on when you open the door because a reed switch detects the door opening. Now you can build the same thing!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP15 | S (signal / DO) | Digital output — HIGH normally, LOW when magnet is near |
| 3V3 | VCC | Power |
| GND | GND | Ground |

> **Optional buzzer:**

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP16 | S (signal) | Buzzer signal pin |
| 3V3 | VCC | Buzzer power |
| GND | GND | Buzzer ground |

---

## 💻 The Code

```c
/**
 * Lesson 23: Reed Switch Module (Magnetic Sensor)
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * The reed switch normally reads HIGH.
 * When a magnet gets close, it reads LOW.
 * We use this to detect door open/close events!
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK library

// Pin connected to the reed switch signal output
#define REED_PIN   15   // GP15 reads the reed switch state
#define BUZZER_PIN 16   // GP16 controls the buzzer (optional)

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial to connect

    printf("=== Lesson 23: Reed Switch Module ===\n");
    printf("Bring a magnet close to see it work!\n\n");

    // Set up the reed switch pin as an INPUT
    gpio_init(REED_PIN);
    gpio_set_dir(REED_PIN, GPIO_IN);   // We are READING from this pin
    // The module has its own pull-up resistor, but we add one just in case
    gpio_pull_up(REED_PIN);

    // Set up the buzzer pin as an OUTPUT (optional alarm sound)
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);  // We are WRITING to this pin
    gpio_put(BUZZER_PIN, 0);             // Start with buzzer off

    // We need to remember the previous state to detect CHANGES
    // Previous state starts as "no magnet" (HIGH = true)
    bool previous_state = true;   // true = HIGH = no magnet nearby
    int  open_count     = 0;      // Count how many times the switch opened

    printf("Waiting for magnet events...\n\n");

    while (true) {  // Loop forever

        // Read the current state of the reed switch
        // HIGH (true)  = no magnet — switch is OPEN
        // LOW  (false) = magnet nearby — switch is CLOSED
        bool current_state = gpio_get(REED_PIN);  // Read pin state

        // Check if the state has CHANGED since last loop
        if (current_state != previous_state) {
            // The state changed! Something happened!

            if (current_state == false) {
                // State went HIGH -> LOW = magnet arrived!
                printf("MAGNET DETECTED! Switch is CLOSED.\n");
                printf("   (Like a door closing — magnet on door frame is near)\n");

                // Give a short beep to confirm
                gpio_put(BUZZER_PIN, 1);   // Buzzer ON
                sleep_ms(100);             // Beep for 100ms
                gpio_put(BUZZER_PIN, 0);   // Buzzer OFF

            } else {
                // State went LOW -> HIGH = magnet went away!
                open_count++;              // Count this as an "open" event
                printf("MAGNET REMOVED! Switch is OPEN. (Door opened #%d)\n",
                       open_count);
                printf("   (Like a door opening — magnet moved away)\n");

                // Give a longer beep for the alarm
                gpio_put(BUZZER_PIN, 1);   // Buzzer ON
                sleep_ms(500);             // Beep for 500ms — ALERT!
                gpio_put(BUZZER_PIN, 0);   // Buzzer OFF
            }

            // Update our memory of the previous state
            previous_state = current_state;
        }

        // Small delay to avoid reading too fast (debouncing)
        sleep_ms(50);  // Check 20 times per second — plenty fast!
    }

    return 0;   // Never reached
}
```

---

## 🔍 How the Code Works

1. **Digital reading:** The reed switch gives us a simple HIGH or LOW signal. HIGH means no magnet is nearby. LOW means a magnet is close and has closed the switch inside.

2. **State change detection:** Instead of just printing every single reading, we save the `previous_state` and only print when it CHANGES. This is much more useful — we only care about when something happens!

3. **Edge detection:** Detecting when state goes from HIGH to LOW (magnet arrives) or LOW to HIGH (magnet leaves) is called "edge detection". It is like watching for the exact moment a door opens, not just checking if it is open.

4. **Event counting:** The `open_count` variable keeps track of how many times the switch has opened. This is like the counter on a door at a shop that counts how many customers came in!

5. **Debouncing:** The `sleep_ms(50)` at the end slows down our reading loop. Without it, the switch might register multiple times when it changes because of tiny vibrations. The 50ms pause smooths this out.

---

## 🎮 Try It!

1. **Slow approach:** Bring the magnet very slowly toward the module. Can you find the exact distance where the switch triggers?

2. **Direction matters:** Try approaching from different sides. Does the switch trigger from all directions or only when the magnet is near the glass tube?

3. **Through materials:** Put the reed switch module under a piece of cardboard or plastic. Can the magnet still trigger it through the material?

4. **Count opens:** Put the module near a real door and tape the magnet to the door. Every time someone opens the door, the counter goes up!

---

## 🏆 Challenge

Build a **secret entry counter**! Count how many times the "door" has been opened. After every 5 opens, print a special message like "5 entries detected!" and play a little tune on the buzzer (3 beeps in different lengths). Use the `open_count` variable and check if `open_count % 5 == 0` to detect every 5th entry. (The `%` operator gives the remainder when dividing!)

---

## 📝 Summary

The reed switch uses the magic of magnetism to close an electrical circuit without any physical contact. It reads HIGH normally and goes LOW when a magnet comes close. By checking for state changes, you can detect the exact moment a door opens or closes — making it perfect for security systems, automatic lights, and counting visitors. Real burglar alarms use the exact same technique!
