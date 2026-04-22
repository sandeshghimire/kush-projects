# Lesson 10: Flame Sensor Module — Fire Alarm!

## 🎯 What you'll learn
- How the Flame Sensor Module detects invisible infrared (IR) light from flames
- How to read both the analog and digital outputs of the same sensor
- How to build a multi-level alert system using signal thresholds
- How to combine three outputs (serial, buzzer, RGB LED) into a proper alarm
- How to create an alarm beep pattern using loops and `gpio_put` with `sleep_ms`

## 🛒 Parts you'll need
- Raspberry Pi Pico 2 W (~$7)
- Elegoo 37 Sensor Kit Flame Sensor Module (included in kit)
- Elegoo 37 Sensor Kit Active Buzzer Module (included in kit)
- Elegoo 37 Sensor Kit RGB LED Module (included in kit)
- Breadboard and jumper wires (included in kit)
- USB cable to connect Pico to your computer

## 🌟 Background

The **Flame Sensor Module** from your Elegoo kit has a special detector — a tiny part that is extra-sensitive to **infrared (IR) light**. Ordinary visible light (the light you can see) does not affect it much. But flames and very hot objects give off lots of infrared light, which is invisible to human eyes but not to this sensor! When IR light hits the detector, it creates a small electrical current, which the module turns into a voltage you can measure.

The module has two outputs. The **analog output (A0)** gives a number from 0 to 4095. Here is the clever twist: more IR light means *lower* voltage, so more flame = *lower* number! A number close to 4095 means no flame detected. A very low number, like 100 or 200, means there is lots of IR — something hot and bright is very close! The **digital output (DO)** is simpler: it goes LOW when the IR level crosses a threshold that you set using the small dial on the module. No flame: DO is HIGH. Flame detected: DO is LOW. This is the opposite of what you might expect — LOW means danger!

**Safety note:** Never use a real open flame for this lesson! The flame sensor can also be triggered by a powerful flashlight, a phone screen at full brightness held very close, or the TV remote (which uses IR). Try holding a TV remote about 20 cm from the sensor and pressing a button — the IR burst should trigger the sensor. That is a safe and easy way to test it!

## 🔌 Wiring

| Pico Pin    | Component Pin | Component            |
|-------------|---------------|----------------------|
| GP26 (ADC0) | A0 (analog)   | Flame Sensor Module  |
| GP14        | DO (digital)  | Flame Sensor Module  |
| 3V3         | VCC           | Flame Sensor Module  |
| GND         | GND           | Flame Sensor Module  |
| GP15        | S (signal)    | Active Buzzer Module |
| 3V3         | VCC           | Active Buzzer Module |
| GND         | GND           | Active Buzzer Module |
| GP9         | R (red)       | RGB LED Module       |
| GP10        | G (green)     | RGB LED Module       |
| GP11        | B (blue)      | RGB LED Module       |
| GND         | GND           | RGB LED Module       |

> **Tip:** The DO pin goes LOW when a flame is detected and HIGH when it is safe. This is called *active-low* logic and is common in electronics. Always check the lesson notes to know which way a sensor works.

> **Tip:** The dial on the module adjusts the DO threshold. Turn it clockwise to make the sensor LESS sensitive (needs a very intense IR source). Turn it counter-clockwise to make it MORE sensitive (triggers from further away).

## 💻 The code

```c
/**
 * Lesson 10: Flame Sensor Module — Fire Alarm!
 *
 * Reads both outputs of the Flame Sensor Module:
 *   A0 (analog, GP26) — 0 = intense flame, 4095 = no flame
 *   DO (digital, GP14) — LOW = flame detected, HIGH = safe
 *
 * Alarm states:
 *   Safe         -> GREEN LED, no buzzer
 *   DO triggered -> RED LED, rapid alarm buzzer pattern
 *
 * Analog proximity levels (printed to serial):
 *   0-500        -> "VERY CLOSE!"
 *   501-2000     -> "Nearby"
 *   2001-4095    -> "Safe / no flame"
 */

#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/adc.h"
#include <stdio.h>

// --- Pin definitions ---
#define FLAME_ANALOG_PIN  26   // GP26 = ADC0, connects to A0 on module
#define FLAME_DO_PIN      14   // GP14, connects to DO on module
#define BUZZER_PIN        15   // Active Buzzer Module signal pin
#define LED_R_PIN          9   // RGB LED Module red channel
#define LED_G_PIN         10   // RGB LED Module green channel
#define LED_B_PIN         11   // RGB LED Module blue channel

// --- Analog threshold levels (remember: lower = more flame!) ---
#define VERY_CLOSE_THRESHOLD   500   // 0-500: very intense IR source
#define NEARBY_THRESHOLD      2000   // 501-2000: flame is nearby
// 2001-4095: no significant IR detected

// --- Helper: set RGB LED colour ---
void set_rgb(int r, int g, int b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// -----------------------------------------------
// sound_alarm — runs a rapid beeping alarm pattern.
// The buzzer beeps fast while the loop runs.
// We also flash the LED red during the alarm.
//
// Parameters:
//   beeps — how many rapid beeps to make
// -----------------------------------------------
void sound_alarm(int beeps) {
    for (int i = 0; i < beeps; i++) {
        gpio_put(BUZZER_PIN, 1);   // buzzer ON
        set_rgb(1, 0, 0);          // LED red (danger!)
        sleep_ms(80);

        gpio_put(BUZZER_PIN, 0);   // buzzer OFF
        set_rgb(0, 0, 0);          // LED off (flash effect)
        sleep_ms(60);
    }
    // After the beeps, leave LED red (stay in alarm state)
    set_rgb(1, 0, 0);
}

// -----------------------------------------------
// get_proximity_label — converts an analog reading
// to a human-readable distance description.
//
// Remember: LOWER reading = MORE intense IR = CLOSER!
// -----------------------------------------------
const char* get_proximity_label(uint16_t reading) {
    if (reading <= VERY_CLOSE_THRESHOLD) {
        return "VERY CLOSE! Back away!";
    } else if (reading <= NEARBY_THRESHOLD) {
        return "Nearby - caution";
    } else {
        return "Safe / no flame";
    }
}

int main() {
    // -----------------------------------------------
    // 1. Start serial monitor
    // -----------------------------------------------
    stdio_init_all();
    sleep_ms(2000);
    printf("=== Lesson 10: Flame Sensor Fire Alarm ===\n");
    printf("DO is LOW when flame detected (active-low logic!)\n");
    printf("Analog: lower number = more IR = closer to source\n\n");
    printf("Safe test: point a TV remote at the sensor and press a button.\n\n");

    // -----------------------------------------------
    // 2. Set up RGB LED pins
    // -----------------------------------------------
    gpio_init(LED_R_PIN);  gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN);  gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN);  gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(0, 1, 0);  // Start GREEN = all clear

    // -----------------------------------------------
    // 3. Set up active buzzer pin
    // -----------------------------------------------
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
    gpio_put(BUZZER_PIN, 0);  // buzzer off at start

    // -----------------------------------------------
    // 4. Set up Flame Sensor digital pin (DO)
    // -----------------------------------------------
    // DO is active-low: HIGH = safe, LOW = flame
    // The module has its own pull-up, but we enable the Pico's
    // internal pull-up too for a reliable idle HIGH state.
    gpio_init(FLAME_DO_PIN);
    gpio_set_dir(FLAME_DO_PIN, GPIO_IN);
    gpio_pull_up(FLAME_DO_PIN);  // ensure it reads HIGH when nothing is detected

    // -----------------------------------------------
    // 5. Set up ADC for analog reading (A0)
    // -----------------------------------------------
    adc_init();
    adc_gpio_init(FLAME_ANALOG_PIN);  // put GP26 in ADC mode
    adc_select_input(0);              // GP26 = ADC channel 0

    // -----------------------------------------------
    // 6. Main loop
    // -----------------------------------------------
    while (true) {
        // --- Read both sensor outputs ---
        uint16_t analog_val   = adc_read();       // 0 (intense IR) to 4095 (no IR)
        bool     flame_digital = !gpio_get(FLAME_DO_PIN);  // true when DO is LOW (flame!)

        // --- Print status to serial ---
        printf("Analog: %4d | Proximity: %-25s | DO: %s\n",
               analog_val,
               get_proximity_label(analog_val),
               flame_digital ? "FLAME DETECTED!" : "safe");

        // --- Take action based on digital output ---
        if (flame_digital) {
            // ALARM STATE: DO went LOW, threshold exceeded!
            printf("*** FLAME DETECTED — ALARM! ***\n");

            // Sound the alarm: 8 rapid beeps with red LED flashing
            sound_alarm(8);

            // After the alarm burst, print a follow-up message
            printf("Check the sensor reading: analog=%d (%s)\n\n",
                   analog_val, get_proximity_label(analog_val));

            // Keep LED red while flame is detected
            set_rgb(1, 0, 0);

        } else {
            // SAFE STATE: No flame above threshold
            // Show extra info based on the analog reading
            if (analog_val <= VERY_CLOSE_THRESHOLD) {
                // Very strong IR but not past DO threshold yet?
                // Maybe the potentiometer needs adjustment, or it's
                // a non-flame IR source. Show YELLOW as a warning.
                set_rgb(1, 1, 0);  // yellow = caution
                printf("Strong IR but DO not triggered. Adjust potentiometer?\n");

            } else if (analog_val <= NEARBY_THRESHOLD) {
                // Some IR detected — warm orange-ish warning
                set_rgb(1, 1, 0);  // yellow
                printf("Mild IR source nearby.\n");

            } else {
                // Fully safe — green light!
                set_rgb(0, 1, 0);
            }

            // Make sure buzzer is off in safe state
            gpio_put(BUZZER_PIN, 0);
        }

        // Wait 200 ms before reading again
        sleep_ms(200);
    }

    return 0;
}
```

## 🔍 How the code works

1. **Active-low logic with `!gpio_get(FLAME_DO_PIN)`** — The flame sensor's DO pin is HIGH when safe and LOW when a flame is detected. So instead of `gpio_get() == 1` meaning "yes," we flip it with `!` (the NOT operator). Now `flame_digital` is `true` when there IS a flame — which feels much more natural to read in the code. Sensors that work this backwards way are everywhere in electronics!

2. **`adc_read()` returning a lower number for more flame** — This trips up a lot of people! The sensor's analog output voltage drops when it detects more IR. The ADC converts lower voltage to a lower number, so low = strong IR = close flame. That is why `VERY_CLOSE_THRESHOLD` is a small number (500) and the "safe" range is the high numbers near 4095.

3. **`get_proximity_label()`** — This function takes a reading and returns a piece of text describing what it means. It uses the same threshold logic as the LED decisions, but converts it to words. Separating the "what does this number mean?" logic into its own function keeps the main loop clean and easy to read.

4. **`sound_alarm(int beeps)`** — The alarm function runs a `for` loop, toggling the buzzer and LED on and off rapidly. Each pass: buzzer ON + LED red for 80 ms, then both OFF for 60 ms. This creates the classic fast-beep alarm sound. The `sleep_ms()` calls inside the loop control the speed — shorter sleeps = faster and more urgent beeping!

5. **`gpio_pull_up(FLAME_DO_PIN)`** — This enables the Pico's built-in safety net on the DO pin, ensuring the pin reads HIGH (safe) when nothing is connected or when the sensor is idle. It prevents false alarms from a pin with nothing connected to it.

6. **`printf()` with `%-25s`** — The `-25` in the format specifier means "left-align this string in a field of 25 characters." This pads short strings with spaces on the right so that all the columns in your serial output stay neatly lined up, like a table.

7. **Yellow LED for the middle case** — If the analog reading is low (showing significant IR) but DO has not triggered yet, the code shows yellow instead of green. This is like a "hmm, something is suspicious" warning state. Real alarm systems use these multi-level alerts all the time.

## 🚀 Try it

1. **TV remote test:** Point a TV remote at the flame sensor from about 15 cm away and press any button. Does the serial monitor show the analog number drop? Can you get it to trigger the DO alarm? Try pressing and holding a button — some remotes keep sending IR the whole time.

2. **Distance test:** Use a phone torch (flashlight) and slowly bring it closer to the sensor from 1 metre away. Watch the analog number in the serial monitor decrease as you get closer. At what distance does the number drop below 2000? Below 500?

3. **Threshold tuning:** Use a small screwdriver to slowly adjust the dial on the Flame Sensor Module while pointing a TV remote at it. Find the setting where a remote from 30 cm triggers the DO alarm, but room lighting alone does not.

4. **Alarm pattern:** Modify the `sound_alarm()` function to make a different pattern. Try a two-tone pattern: beep fast three times, pause 200 ms, then beep fast three times again. How urgent can you make it sound?

## 🏆 Challenge

**Multi-sensor fire alarm system!** Combine the Flame Sensor with the DHT11 from Lesson 9. A real fire detector uses both IR (flame) AND heat (temperature). Build a system with three alert levels:

- **All clear (green LED):** No flame detected AND temperature below 30°C
- **Heat warning (yellow LED, slow beep every 2 seconds):** Temperature above 30°C but no flame on DO
- **FIRE ALARM (red LED, rapid beeping):** DO triggered OR temperature above 40°C

This means the alarm triggers if either sensor detects a problem — just like a real fire alarm! Use `time_us_64()` for the slow-beep timer (from Lesson 7) so the loop does not block while waiting between beeps. Print the current state, temperature, humidity, and analog flame reading to the serial monitor every second.

## ✅ Summary

The Flame Sensor Module detects infrared light with an analog output (lower number = stronger IR = closer source) and a threshold digital output (LOW = flame detected — active-low logic). By reading both outputs, you built a multi-level alarm: the analog value tells you how close the IR source is, while the digital output triggers the actual alarm. Combining this with an active buzzer and an RGB LED gave you a proper fire alarm system with visual and audio alerts — a real-world project that uses everything you have learned about ADC, GPIO, and program logic!
