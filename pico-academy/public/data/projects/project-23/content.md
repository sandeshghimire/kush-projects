# Project 23: Magic Door Alarm — Guard Your Secret Stuff!

## 🎯 What You'll Learn
- How a Reed Switch detects magnets
- How to trigger an alarm when something changes
- How real burglar alarms work
- How to use GPIO input with interrupts

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Reed Switch Module | $1.50 |
| Small Magnet (from kit or fridge magnet) | $0.50 |
| Active Buzzer Module | $1.00 |
| Red LED | $0.10 |
| Green LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.40** |

## 🌟 The Story

Imagine you have a super secret diary, or a treasure box full of your best Pokémon cards. You do NOT want anyone sneaking in! Real security systems use invisible sensors to guard doors and windows. When the door opens — BEEP BEEP BEEP — the alarm goes off!

A Reed Switch is a clever sensor that closes (connects) when a magnet is nearby. Stick the magnet to a door and the switch to the frame. The magnet holds the switch closed. When the door opens, the magnet moves away and the switch opens — ALARM! Today you will build exactly that!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Reed Switch module VCC | Pico 3.3V | Power |
| Reed Switch module GND | Pico GND | Ground |
| Reed Switch module OUT | Pico GP5 | Signal output |
| Buzzer + pin | Pico GP15 | Alarm buzzer |
| Buzzer - pin | Pico GND | Ground |
| Red LED long leg | Pico GP14 via 220Ω | Alarm LED |
| Red LED short leg | Pico GND | Ground |
| Green LED long leg | Pico GP13 via 220Ω | "Safe" indicator |
| Green LED short leg | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include <stdio.h>          // For printf messages

// Pin definitions
#define REED_PIN    5       // Reed switch signal output
#define BUZZER_PIN  15      // Active buzzer
#define RED_LED     14      // Alarm LED (red)
#define GREEN_LED   13      // Safe LED (green)

// How long the alarm beeps
#define ALARM_BEEPS     10  // Number of beeps when door opens
#define BEEP_ON_MS      200 // Each beep lasts 200ms
#define BEEP_OFF_MS     150 // Gap between beeps

// Track the door state
bool door_was_open = false;  // Was the door open last time we checked?
bool alarm_active = false;   // Is the alarm going right now?

// Play the alarm sound
void sound_alarm() {
    printf("*** ALARM! ALARM! INTRUDER! ***\n");  // Print warning
    gpio_put(GREEN_LED, 0);                        // Turn off green light
    
    for (int i = 0; i < ALARM_BEEPS; i++) {       // Beep multiple times
        gpio_put(BUZZER_PIN, 1);                   // Buzzer ON
        gpio_put(RED_LED, 1);                      // Red LED ON
        sleep_ms(BEEP_ON_MS);                      // Wait
        gpio_put(BUZZER_PIN, 0);                   // Buzzer OFF
        gpio_put(RED_LED, 0);                      // Red LED OFF
        sleep_ms(BEEP_OFF_MS);                     // Gap between beeps
    }
}

// Show the "all safe" state
void show_safe() {
    gpio_put(BUZZER_PIN, 0);    // Make sure buzzer is off
    gpio_put(RED_LED, 0);       // Red LED off
    gpio_put(GREEN_LED, 1);     // Green LED on — safe!
    printf("Door closed. All safe!\n");  // Print status
}

// Show the "door is open" state (but alarm already done)
void show_open() {
    gpio_put(GREEN_LED, 0);     // Green off
    gpio_put(RED_LED, 1);       // Red on — door is open!
    printf("Door is open!\n");  // Print status
}

int main() {
    stdio_init_all();           // Start USB serial
    sleep_ms(2000);             // Wait for USB to connect

    // Set up reed switch pin
    gpio_init(REED_PIN);        // Initialize reed switch pin
    gpio_set_dir(REED_PIN, GPIO_IN);   // Set as input
    gpio_pull_up(REED_PIN);     // Pull-up so it reads HIGH when magnet is near

    // Set up output pins
    gpio_init(BUZZER_PIN);      // Initialize buzzer
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);   // Buzzer off to start

    gpio_init(RED_LED);         // Initialize red LED
    gpio_set_dir(RED_LED, GPIO_OUT);
    gpio_put(RED_LED, 0);      // Off to start

    gpio_init(GREEN_LED);       // Initialize green LED
    gpio_set_dir(GREEN_LED, GPIO_OUT);
    gpio_put(GREEN_LED, 0);    // Off to start

    printf("=== MAGIC DOOR ALARM ===\n");         // Welcome message
    printf("Place magnet near reed switch...\n"); // Instructions
    printf("System armed and ready!\n");

    // Short startup beep to show system is ready
    gpio_put(BUZZER_PIN, 1);    // Quick beep
    sleep_ms(100);
    gpio_put(BUZZER_PIN, 0);
    sleep_ms(100);
    gpio_put(BUZZER_PIN, 1);    // Second quick beep
    sleep_ms(100);
    gpio_put(BUZZER_PIN, 0);

    // Check initial door state
    bool current_state = gpio_get(REED_PIN);  // Read switch
    door_was_open = current_state;             // Save initial state

    if (!current_state) {       // Reed switch reads LOW when magnet is nearby
        show_safe();             // Door starts closed — safe!
    } else {
        show_open();             // Door starts open
    }

    while (true) {              // Loop forever

        // Read the current state of the reed switch
        // LOW = magnet nearby = door CLOSED
        // HIGH = magnet gone  = door OPEN
        bool door_open = gpio_get(REED_PIN);  // Read the pin

        if (door_open && !door_was_open) {    // Door just OPENED!
            printf("DOOR OPENED - TRIGGERING ALARM!\n");
            alarm_active = true;               // Mark alarm as active
            sound_alarm();                     // Sound the alarm!
            show_open();                       // Show open state
        } else if (!door_open && door_was_open) {  // Door just CLOSED!
            printf("Door closed.\n");
            alarm_active = false;              // Alarm no longer needed
            show_safe();                       // Show safe state
        }

        door_was_open = door_open;            // Remember state for next loop

        sleep_ms(50);           // Check 20 times per second
    }

    return 0;                   // Never reaches here
}
```

## 🔍 How It Works

1. The Reed Switch has tiny metal contacts inside that close when a magnet is nearby
2. When the magnet (on the door) is close, the switch is closed and the signal is LOW
3. When the door opens, the magnet moves away, the switch opens, signal goes HIGH
4. The Pico detects this change from LOW to HIGH and triggers the alarm
5. Green LED means safe, red LED and buzzer means the door was opened!

## 🎮 Try It!

- Slowly bring the magnet close to the reed switch — when does the green light come on?
- Move the magnet away quickly — does the alarm trigger?
- Tape the reed switch to a box lid and the magnet inside — now open the box!
- Can you adjust `ALARM_BEEPS` to make the alarm shorter or longer?

## 🏆 Challenge

Add a secret "disable" button that you must press within 3 seconds of opening the door to silence the alarm. This is how real alarm systems work — you have a short window to type your code before the alarm goes off!

## 📝 What You Built

You built a real magnetic door alarm using a Reed Switch sensor — the same technology used in actual home security systems! Your Pico can now guard any door, box, or drawer and sound an alert whenever someone tries to sneak in.
