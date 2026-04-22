# Project 26: Rainbow Party Mode — Let's Get This Party Started!

## 🎯 What You'll Learn
- How the Seven-Color Flash LED automatically cycles through colours
- How to use a button to start and stop a light show
- How to play simple tunes with a passive buzzer
- How to combine multiple components for a fun effect

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Seven-Color Flash LED Module | $1.50 |
| Passive Buzzer Module | $1.50 |
| Push Button | $0.50 |
| 10kΩ Resistor | $0.10 |
| 220Ω Resistor | $0.10 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$13.70** |

## 🌟 The Story

Imagine you are at the best birthday party ever. The music is pumping, coloured lights are flashing everywhere, and everyone is dancing! Now imagine YOU made those lights and that music with your own hands. That would be the coolest thing ever!

The Seven-Color Flash LED is magical — it automatically cycles through red, orange, yellow, green, blue, indigo, and violet all by itself! You just need to give it power. Your job is to sync it with party music from the passive buzzer. Press the button and the party starts. Press it again and the party stops. DJ Pico is in the house!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Seven-Color LED module + pin | Pico GP16 via 220Ω | Positive — controls on/off |
| Seven-Color LED module - pin | Pico GND | Ground |
| Passive Buzzer + pin | Pico GP17 | Music buzzer (needs PWM!) |
| Passive Buzzer - pin | Pico GND | Ground |
| Button one leg | Pico GP10 | Party start/stop button |
| Button other leg | Pico GND | Ground |
| 10kΩ resistor | GP10 to 3.3V | Pull-up resistor |

## 💻 The Code

```c
#include "pico/stdlib.h"        // Always include this first!
#include "hardware/pwm.h"       // Need PWM to play buzzer music
#include "hardware/clocks.h"    // For clock frequency
#include <stdio.h>              // For printf

// Pin definitions
#define PARTY_LED_PIN  16       // Seven-color flash LED
#define BUZZER_PIN     17       // Passive buzzer (needs PWM)
#define BUTTON_PIN     10       // Start/stop button

// Note frequencies in Hz (musical notes!)
#define NOTE_C4   262           // Middle C
#define NOTE_D4   294           // D
#define NOTE_E4   330           // E
#define NOTE_F4   349           // F
#define NOTE_G4   392           // G
#define NOTE_A4   440           // A
#define NOTE_B4   494           // B
#define NOTE_C5   523           // High C
#define REST        0           // No note (silence)

// Party state
bool party_on = false;          // Is the party going?

// Play a note using PWM on the buzzer
void play_note(int frequency, int duration_ms) {
    if (frequency == REST) {                    // If rest (silence)
        gpio_set_function(BUZZER_PIN, GPIO_FUNC_NULL);  // Turn off PWM
        gpio_init(BUZZER_PIN);                  // Regular GPIO
        gpio_set_dir(BUZZER_PIN, GPIO_OUT);
        gpio_put(BUZZER_PIN, 0);               // Low = quiet
        sleep_ms(duration_ms);                  // Wait
        return;
    }

    // Set up PWM for this note
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);      // PWM mode
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);     // Get PWM slice
    uint channel = pwm_gpio_to_channel(BUZZER_PIN);     // Get channel

    // Calculate PWM settings for desired frequency
    uint32_t clock_freq = clock_get_hz(clk_sys);        // System clock speed
    uint32_t divider = clock_freq / (frequency * 256);  // Calculate divider
    if (divider < 1) divider = 1;                       // Minimum divider

    pwm_set_clkdiv(slice, (float)divider);              // Set clock divider
    pwm_set_wrap(slice, 255);                            // 256 steps per cycle
    pwm_set_chan_level(slice, channel, 128);             // 50% duty = loud!
    pwm_set_enabled(slice, true);                        // Start PWM

    sleep_ms(duration_ms);                               // Play for duration

    pwm_set_enabled(slice, false);                       // Stop PWM
    sleep_ms(20);                                        // Tiny gap between notes
}

// Stop the buzzer
void stop_buzzer() {
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_NULL);
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);
}

// Play a happy party tune!
void play_party_tune() {
    // A simple upbeat melody
    int notes[]    = {NOTE_C4, NOTE_E4, NOTE_G4, NOTE_C5, NOTE_G4,
                      NOTE_E4, NOTE_C4, NOTE_G4, NOTE_F4, NOTE_A4,
                      NOTE_C5, NOTE_A4, NOTE_F4, NOTE_C4, REST};
    int durations[] = {150, 150, 150, 300, 150,
                       150, 300, 150, 150, 150,
                       300, 150, 150, 300, 100};
    int num_notes = 15;                      // Total notes in the melody

    for (int i = 0; i < num_notes; i++) {   // Play each note
        if (!party_on) break;               // Stop if party ended
        play_note(notes[i], durations[i]);  // Play the note
    }
}

// Check if button was pressed (debounced)
bool button_pressed() {
    if (gpio_get(BUTTON_PIN) == 0) {        // Button is pressed (LOW with pull-up)
        sleep_ms(50);                        // Debounce delay
        if (gpio_get(BUTTON_PIN) == 0) {    // Still pressed?
            while (gpio_get(BUTTON_PIN) == 0) {  // Wait for release
                sleep_ms(10);
            }
            return true;                    // Button was pressed!
        }
    }
    return false;                           // No press
}

int main() {
    stdio_init_all();               // Start USB serial
    sleep_ms(2000);                 // Wait for USB

    // Set up LED pin
    gpio_init(PARTY_LED_PIN);
    gpio_set_dir(PARTY_LED_PIN, GPIO_OUT);
    gpio_put(PARTY_LED_PIN, 0);    // LED off

    // Set up buzzer pin
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);

    // Set up button
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);       // Pull-up: HIGH = not pressed

    printf("=== RAINBOW PARTY MODE ===\n");
    printf("Press the button to START the party!\n");
    printf("Press again to stop.\n\n");

    while (true) {                  // Loop forever

        if (button_pressed()) {     // Check if button pressed
            party_on = !party_on;   // Toggle party state

            if (party_on) {
                printf("*** PARTY TIME! LET'S GO! ***\n");
                gpio_put(PARTY_LED_PIN, 1);    // LED on!
            } else {
                printf("Party stopped. Thanks for coming!\n\n");
                gpio_put(PARTY_LED_PIN, 0);    // LED off
                stop_buzzer();                  // Stop any music
            }
        }

        if (party_on) {             // If party is on...
            printf("Playing party tune!\n");
            play_party_tune();      // Play the melody!
            
            // Keep LED on while party is going
            gpio_put(PARTY_LED_PIN, 1);
        } else {
            // Gently pulse LED to show we are waiting
            gpio_put(PARTY_LED_PIN, 1);
            sleep_ms(100);
            gpio_put(PARTY_LED_PIN, 0);
            sleep_ms(900);
        }
    }

    return 0;
}
```

## 🔍 How It Works

1. The Seven-Color Flash LED has a tiny chip inside that cycles colours automatically
2. When you power it (GP16 HIGH), it just starts flashing through all the rainbow colours
3. The passive buzzer needs PWM (a rapidly changing signal) to make sound
4. Different PWM frequencies make different musical notes
5. The button toggles the party on and off!

## 🎮 Try It!

- Press the button and watch the rainbow colours flash while music plays!
- Press the button again mid-song — does it stop?
- Try adding new notes to the `notes[]` array to change the tune
- Hold the Seven-Color LED up to a piece of white paper for a cool rainbow effect!

## 🏆 Challenge

Add a second button to choose between three different songs! Store the melodies in separate arrays and use a variable to track which song is selected. Button 1 starts/stops, Button 2 cycles through the songs. Now you are a real DJ!

## 📝 What You Built

You built a mini light-and-music party machine using a self-cycling rainbow LED and a buzzer that plays real melodies! You learned about PWM music, button toggling, and how to combine different components into something awesome and fun.
