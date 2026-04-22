# Project 22: Traffic Light — Stop, Wait, Go!

## 🎯 What You'll Learn
- How to use a Dual-Color LED module (red and green from one component)
- How to sequence timed events like a real traffic light
- How to use a button to trigger a pedestrian crossing mode
- How traffic lights work in the real world

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Dual-Color LED Module (red/green) | $1.50 |
| Yellow LED | $0.10 |
| 220Ω Resistors (x2) | $0.20 |
| Push Button | $0.50 |
| 10kΩ Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$12.40** |

## 🌟 The Story

Have you ever waited at a traffic light and wondered how it knows when to change? Real traffic lights have tiny computers inside, just like your Pico! They count seconds, check for cars and people, and switch colours at the right time.

Today you will build your very own traffic light! Your light will cycle through green, yellow, and red just like a real one. And the best part? You can press a button to make it stop for a "pedestrian crossing" — as if a little person is walking across the road. Beep beep, please let me cross!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Dual-Color LED module GND | Pico GND | Ground for module |
| Dual-Color LED module R pin | Pico GP2 | Controls the red LED inside |
| Dual-Color LED module G pin | Pico GP3 | Controls the green LED inside |
| Yellow LED long leg | Pico GP4 via 220Ω | Yellow light |
| Yellow LED short leg | Pico GND | Ground |
| Button one leg | Pico GP10 | Pedestrian button |
| Button other leg | Pico GND | Ground |
| 10kΩ resistor | GP10 to 3.3V | Pull-up resistor |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include <stdio.h>          // For printf messages

// Pin numbers for our traffic light
#define RED_PIN    2        // Red LED on dual-color module
#define GREEN_PIN  3        // Green LED on dual-color module
#define YELLOW_PIN 4        // Separate yellow LED
#define BUTTON_PIN 10       // Pedestrian crossing button

// How long each light stays on (in milliseconds)
#define GREEN_TIME   5000   // Green stays on for 5 seconds
#define YELLOW_TIME  2000   // Yellow stays on for 2 seconds
#define RED_TIME     5000   // Red stays on for 5 seconds
#define WALK_TIME    4000   // Pedestrian crossing lasts 4 seconds

// Track if someone pressed the pedestrian button
bool pedestrian_waiting = false;   // Nobody waiting yet

// Interrupt handler — called when button is pressed
void button_pressed(uint gpio, uint32_t events) {
    if (gpio == BUTTON_PIN) {              // Make sure it is our button
        pedestrian_waiting = true;         // Set the flag
        printf("Pedestrian request registered!\n");  // Print message
    }
}

// Turn all lights off
void all_off() {
    gpio_put(RED_PIN, 0);                  // Red off
    gpio_put(YELLOW_PIN, 0);              // Yellow off
    gpio_put(GREEN_PIN, 0);               // Green off
}

// Show just the red light
void show_red() {
    all_off();                             // Turn everything off first
    gpio_put(RED_PIN, 1);                 // Red on!
    printf("RED - Stop!\n");              // Print status
}

// Show just the yellow light
void show_yellow() {
    all_off();                             // Turn everything off first
    gpio_put(YELLOW_PIN, 1);             // Yellow on!
    printf("YELLOW - Get ready...\n");   // Print status
}

// Show just the green light
void show_green() {
    all_off();                             // Turn everything off first
    gpio_put(GREEN_PIN, 1);              // Green on!
    printf("GREEN - Go!\n");             // Print status
}

// Flash the red light during pedestrian crossing
void pedestrian_crossing() {
    printf("PEDESTRIAN CROSSING - Walk now!\n");  // Print message
    show_red();                            // Keep red for cars
    
    // Flash a pattern to show pedestrians can cross
    for (int i = 0; i < 8; i++) {        // Flash 8 times
        gpio_put(GREEN_PIN, 1);           // Green flashes too (walk signal)
        sleep_ms(250);                    // On for 250ms
        gpio_put(GREEN_PIN, 0);           // Off
        sleep_ms(250);                    // Off for 250ms
    }
    
    pedestrian_waiting = false;           // Reset the pedestrian flag
}

int main() {
    stdio_init_all();                     // Start USB serial
    sleep_ms(2000);                       // Wait for USB connection

    // Set up traffic light pins
    gpio_init(RED_PIN);                   // Initialize red pin
    gpio_set_dir(RED_PIN, GPIO_OUT);      // Set as output
    
    gpio_init(YELLOW_PIN);                // Initialize yellow pin
    gpio_set_dir(YELLOW_PIN, GPIO_OUT);   // Set as output
    
    gpio_init(GREEN_PIN);                 // Initialize green pin
    gpio_set_dir(GREEN_PIN, GPIO_OUT);    // Set as output

    // Set up button pin
    gpio_init(BUTTON_PIN);                // Initialize button pin
    gpio_set_dir(BUTTON_PIN, GPIO_IN);    // Set as input
    gpio_pull_up(BUTTON_PIN);             // Enable pull-up resistor

    // Set up interrupt for button — this detects button presses automatically
    gpio_set_irq_enabled_with_callback(
        BUTTON_PIN,                        // Which pin to watch
        GPIO_IRQ_EDGE_FALL,               // Trigger on falling edge (button pressed)
        true,                              // Enable it
        &button_pressed                    // Function to call
    );

    printf("=== TRAFFIC LIGHT SYSTEM ===\n");   // Welcome message
    printf("Press button for pedestrian crossing!\n");

    while (true) {                         // Loop forever

        // --- GREEN PHASE ---
        show_green();                      // Show green light
        for (int t = 0; t < GREEN_TIME; t += 100) {   // Wait in small chunks
            sleep_ms(100);                 // Wait 100ms at a time
            if (pedestrian_waiting && t >= 2000) {     // Check button after 2s
                break;                     // Exit early if pedestrian waiting
            }
        }

        // --- YELLOW PHASE ---
        show_yellow();                     // Show yellow light
        sleep_ms(YELLOW_TIME);             // Wait full yellow time

        // --- RED PHASE ---
        show_red();                        // Show red light
        
        if (pedestrian_waiting) {          // If someone pressed the button...
            sleep_ms(1000);               // Short pause first
            pedestrian_crossing();         // Do the pedestrian crossing!
        } else {
            sleep_ms(RED_TIME);            // Normal red time
        }

        // Back to top — GREEN again!
    }

    return 0;                              // Never reaches here
}
```

## 🔍 How It Works

1. The Pico cycles through green, yellow, and red with timed delays
2. The dual-color LED module contains both red and green LEDs in one package
3. When you press the button, a GPIO interrupt fires instantly and sets a flag
4. After green ends, the Pico checks the flag and runs pedestrian crossing mode
5. During pedestrian mode, the green LED flashes to signal "walk now"

## 🎮 Try It!

- Watch one full cycle of Green → Yellow → Red → Green
- Press the button while the light is green and see what happens
- Change `GREEN_TIME` to 10000 to make green last longer
- Add a sound effect by connecting a buzzer to beep during yellow

## 🏆 Challenge

Add a second traffic light facing the other direction — when light 1 is green, light 2 is red! This is how a real road intersection works. Use the same timing logic but flip the colours for the second set of pins.

## 📝 What You Built

You built a working traffic light controller with a pedestrian crossing button — just like the real ones on your street! You learned about timed sequences, GPIO interrupts, and how traffic systems keep everyone safe.
