# Lesson 19: Heartbeat Sensor — Listen to Your Pulse!

## What you'll learn
- How the heartbeat sensor detects your pulse using light
- Why real-world sensor signals are noisy and how to clean them up
- How to apply an exponential moving average (EMA) filter in C
- How to detect peaks in a signal to count heartbeats
- How to calculate BPM (beats per minute) from raw data
- How to use the serial plotter to visualise your pulse as a wave!

---

## Parts you'll need
- Raspberry Pi Pico 2 W
- Heartbeat / Pulse Sensor Module (has an analog output — the module with a small flat surface you press your finger on)
- Passive Buzzer Module
- RGB LED Module
- Breadboard and jumper wires
- USB cable for power and serial output
- A quiet hand — you will need to hold very still!

---

## Background

Every time your heart beats, it pumps a tiny burst of blood through your body — including through your fingertips. That little pulse of blood actually changes how much light can pass through your finger for just a moment! The heartbeat sensor shines an **infrared LED** through your fingertip and a **phototransistor** on the other side (or the same side, bouncing light back) picks up the returning light. When a pulse of blood passes through, it slightly blocks more light — and the sensor picks up that tiny dip. Then the blood recedes and the light comes back. That rhythmic rise and fall of the light level is your heartbeat!

This is the same technology used by the finger clip sensors in hospitals — called **pulse oximeters** — that measure not just heart rate but also how much oxygen is in your blood. Smartwatches like Apple Watch and Fitbit use a version of this too, pressed against your wrist instead of your finger. You are using real medical sensor technology!

Here is the tricky part: the raw signal from the sensor is **noisy**. Your hand might shake a tiny bit, the sensor connection might wobble, and the room lights interfere with the IR light. The raw readings jump around a lot and it is hard to see the heartbeat underneath all that noise. This is where **signal filtering** comes in! A filter is a clever maths trick that smooths out the jumpiness while keeping the underlying pattern. You will use one of the most popular filters in all of electronics: the **Exponential Moving Average (EMA)**. Think of it like this — instead of trusting the latest reading completely, you blend it with what you already know. Mostly trust the past (75%), give a little weight to the new reading (25%), and the result is much smoother!

---

## Wiring

### Heartbeat / Pulse Sensor Module (S / VCC / GND or AO / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP26 (ADC0) | S or AO (analog output) | Analog signal — connects to ADC pin |
| 3V3 | VCC | 3.3 V power |
| GND | GND | Ground |

### Passive Buzzer Module (S / VCC / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP18 | S (signal) | PWM tone |
| 3V3 | VCC | Power |
| GND | GND | Ground |

### RGB LED Module (R / G / B / GND)

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP9 | R (Red) | Red channel |
| GP10 | G (Green) | Green channel |
| GP11 | B (Blue) | Blue channel |
| GND | GND | Ground (common cathode) |

> **Tip for getting a good signal:** Press the tip of your index finger gently but firmly onto the sensor. Do not press too hard — you will squeeze the blood out! Hold completely still. It can take 10–15 seconds for the signal to stabilise, so be patient. The signal is finicky — that is completely normal and part of working with real-world sensors!

---

## The code

```c
/**
 * Lesson 19: Heartbeat Sensor — Listen to Your Pulse!
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * Heartbeat Sensor -> GP26 (ADC0)
 * Passive Buzzer   -> GP18
 * RGB LED          -> GP9 (R), GP10 (G), GP11 (B)
 *
 * Algorithm:
 *   1. Read ADC every 10 ms (100 Hz sample rate)
 *   2. Apply EMA filter to smooth the noisy signal
 *   3. Detect peaks (heartbeats) in the filtered signal
 *   4. Count peaks per 10 seconds and calculate BPM
 *   5. Beep and flash RED on each detected heartbeat
 *   6. Print raw + filtered values for Serial Plotter visualisation
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────
#define PULSE_ADC_PIN   26   // GP26 = ADC channel 0
#define BUZZER_PIN      18   // Passive buzzer
#define LED_R_PIN        9   // RGB LED red
#define LED_G_PIN       10   // RGB LED green
#define LED_B_PIN       11   // RGB LED blue

// ── Sampling and filter settings ─────────────────────────────────
#define SAMPLE_INTERVAL_MS   10    // Read sensor every 10 ms = 100 Hz
#define BPM_WINDOW_SEC       10    // Count beats over 10 seconds, then calc BPM

// EMA filter coefficient: 0.75 means "trust previous 75%, new reading 25%"
// Higher alpha = smoother but slower to respond
// Lower alpha  = faster but noisier
// We use fixed-point maths: alpha_fp = 75 (meaning 0.75 * 100)
#define ALPHA_PERCENT   75         // 75% weight on previous filtered value

// Peak detection thresholds
// The filtered signal oscillates. When it rises above HIGH_THRESHOLD and
// then falls below LOW_THRESHOLD, we count one heartbeat.
// You may need to tune these for your sensor and finger pressure!
#define PEAK_HIGH_THRESHOLD  2200  // Signal must go above this to be a peak
#define PEAK_LOW_THRESHOLD   2000  // Signal must fall below this to reset

// ── RGB LED helpers ──────────────────────────────────────────────
void set_rgb(bool r, bool g, bool b) {
    gpio_put(LED_R_PIN, r);
    gpio_put(LED_G_PIN, g);
    gpio_put(LED_B_PIN, b);
}

// ── Buzzer: short heartbeat blip ─────────────────────────────────
void heartbeat_blip(void) {
    // Two quick beeps — lub-DUB — like a real heartbeat sound!
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(BUZZER_PIN);
    uint chan  = pwm_gpio_to_channel(BUZZER_PIN);

    // First blip — lower tone
    uint32_t wrap = 125000000 / (64 * 440) - 1;
    pwm_set_clkdiv(slice, 64.0f);
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, chan, wrap / 2);
    pwm_set_enabled(slice, true);
    sleep_ms(40);

    // Second blip — higher tone
    wrap = 125000000 / (64 * 660) - 1;
    pwm_set_wrap(slice, wrap);
    pwm_set_chan_level(slice, chan, wrap / 2);
    sleep_ms(40);

    pwm_set_enabled(slice, false);
    gpio_set_function(BUZZER_PIN, GPIO_FUNC_SIO);
    gpio_put(BUZZER_PIN, 0);
}

// ── Main ─────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Print column headers for the Serial Plotter
    // (Open Serial Plotter in Arduino IDE or a graphing terminal!)
    printf("Raw,Filtered,BPM_x10\n");  // Column names

    // ── Hardware setup ───────────────────────────────────────────
    gpio_init(LED_R_PIN); gpio_set_dir(LED_R_PIN, GPIO_OUT);
    gpio_init(LED_G_PIN); gpio_set_dir(LED_G_PIN, GPIO_OUT);
    gpio_init(LED_B_PIN); gpio_set_dir(LED_B_PIN, GPIO_OUT);
    set_rgb(false, true, false);  // Green — waiting for finger

    adc_init();
    adc_gpio_init(PULSE_ADC_PIN);
    adc_select_input(0);  // ADC channel 0 = GP26

    // ── Signal processing state ──────────────────────────────────
    uint16_t raw      = 0;
    int32_t  filtered = 0;   // Fixed-point: actual value = filtered / 100
    bool     first_reading = true;

    // Peak detection state machine
    // State 0 = waiting for signal to rise above HIGH_THRESHOLD (looking for peak)
    // State 1 = signal is high — waiting for it to fall back down (past the peak)
    int  peak_state     = 0;
    int  beat_count     = 0;   // Beats counted in current BPM window
    int  last_bpm       = 0;   // Most recent BPM calculation

    // BPM timing
    uint32_t window_start_ms = to_ms_since_boot(get_absolute_time());

    // LED flash timing (flash red briefly on each beat, then back to normal)
    uint32_t beat_flash_until_ms = 0;

    printf("# Place your fingertip gently on the sensor and hold still...\n");
    printf("# Wait 10-15 seconds for the signal to stabilise!\n");

    // ── Main loop ────────────────────────────────────────────────
    while (true) {
        uint32_t loop_start_ms = to_ms_since_boot(get_absolute_time());

        // ── Step 1: Read ADC ─────────────────────────────────────
        raw = adc_read();  // 0 to 4095

        // ── Step 2: Apply EMA filter ─────────────────────────────
        // Formula: filtered = alpha * prev_filtered + (1 - alpha) * raw
        // Using integer maths (multiply everything by 100 to avoid floats):
        //   filtered_fp = ALPHA_PERCENT * prev + (100 - ALPHA_PERCENT) * raw
        // Then divide by 100 to get back to normal scale.
        if (first_reading) {
            filtered = (int32_t)raw * 100;  // Initialise to first reading
            first_reading = false;
        } else {
            filtered = (ALPHA_PERCENT * filtered + (100 - ALPHA_PERCENT) * (int32_t)raw * 100) / 100;
        }
        int32_t filtered_display = filtered / 100;  // Convert back to display scale

        // ── Step 3: Peak detection ────────────────────────────────
        // State machine: wait for high threshold, then wait for low threshold.
        // That full cycle = one heartbeat!
        bool beat_detected = false;

        if (peak_state == 0) {
            // Waiting for signal to climb above the high threshold
            if (filtered_display > PEAK_HIGH_THRESHOLD) {
                peak_state = 1;  // Signal is high — we're on a peak!
            }
        } else {
            // Signal was high — now waiting for it to fall back down
            if (filtered_display < PEAK_LOW_THRESHOLD) {
                // It fell below the low threshold — that's ONE complete heartbeat!
                beat_count++;
                beat_detected = true;
                peak_state    = 0;  // Reset: look for next peak
            }
        }

        // ── Step 4: React to a detected beat! ────────────────────
        if (beat_detected) {
            beat_flash_until_ms = loop_start_ms + 150;  // Flash red for 150ms
            heartbeat_blip();  // Lub-dub!
        }

        // ── Step 5: Update LED ───────────────────────────────────
        if (loop_start_ms < beat_flash_until_ms) {
            set_rgb(true, false, false);   // Red flash — heartbeat!
        } else {
            set_rgb(false, true, false);   // Back to green — waiting
        }

        // ── Step 6: Calculate BPM every 10 seconds ───────────────
        uint32_t elapsed_ms = loop_start_ms - window_start_ms;
        if (elapsed_ms >= (uint32_t)BPM_WINDOW_SEC * 1000) {
            // We counted beats for 10 seconds.
            // BPM = (beats in 10 seconds) * 6 = beats per 60 seconds
            last_bpm        = beat_count * 6;
            beat_count      = 0;
            window_start_ms = loop_start_ms;

            // Print a BPM summary (to the human-readable part of the output)
            // We use "# " prefix so graphing tools ignore this line
            printf("# ─────────────────────────────────────────────\n");
            printf("# BPM: %d", last_bpm);
            if (last_bpm == 0) {
                printf("  (No signal — check finger placement)\n");
            } else if (last_bpm < 50) {
                printf("  (Very slow — is your finger on properly?)\n");
            } else if (last_bpm <= 100) {
                printf("  (Normal range — great!)\n");
            } else if (last_bpm <= 120) {
                printf("  (A bit fast — are you excited?)\n");
            } else {
                printf("  (Very fast! Did you just run?)\n");
            }
            printf("# ─────────────────────────────────────────────\n");
        }

        // ── Step 7: Print data for Serial Plotter ────────────────
        // Print three comma-separated values on one line.
        // Serial Plotter will draw three separate lines!
        // BPM_x10 = BPM * 10 so it fits on the same scale as ADC readings.
        printf("%u,%ld,%d\n", raw, filtered_display, last_bpm * 10);

        // ── Sleep until next sample interval ─────────────────────
        uint32_t elapsed_this_loop = to_ms_since_boot(get_absolute_time()) - loop_start_ms;
        if (elapsed_this_loop < SAMPLE_INTERVAL_MS) {
            sleep_ms(SAMPLE_INTERVAL_MS - elapsed_this_loop);
        }
    }

    return 0;
}
```

---

### How the code works

1. **ADC sampling at 100 Hz** means we read the sensor 100 times per second (every 10 ms). A typical resting heartbeat is 60–100 BPM, which means roughly 1–1.7 beats per second. Reading 100 times per second gives us plenty of data points to catch each beat clearly.

2. **The EMA filter formula** is `filtered = 0.75 * prev + 0.25 * raw`. We use integer maths to avoid floating-point numbers — multiplying everything by 100. So `filtered` is stored as a value 100 times bigger than the real number, and we divide by 100 when we want to display it. This avoids slow floating-point maths on the Pico.

3. **Peak detection uses a two-state machine.** State 0 looks for the signal climbing above `PEAK_HIGH_THRESHOLD`. When it does, we switch to State 1, which waits for the signal to fall below `PEAK_LOW_THRESHOLD`. That full trip up and back down = one heartbeat. Using two different thresholds (a high one and a low one) is called **hysteresis** and prevents false detections from small wiggles in the signal.

4. **BPM calculation** counts beats over a 10-second window, then multiplies by 6 to get beats per 60 seconds (the definition of BPM). 10 seconds is long enough to be accurate but short enough that you do not have to wait forever for the answer.

5. **The Serial Plotter trick** works because we print three comma-separated numbers on each line. If you open a serial plotter (Arduino IDE has one built in — go to Tools > Serial Plotter), it draws each value as a separate coloured line. You can actually *see* your pulse as a wave on screen!

6. **The LED flash** stays red for exactly 150 ms after each beat using a timestamp comparison (`beat_flash_until_ms`). This is a non-blocking technique — no `sleep_ms()` is needed, so the sampling loop keeps running at full speed during the flash.

---

## Try it

1. **Get your signal:** Place your finger on the sensor and watch the raw ADC values on serial. They should jump around at first then start showing a rhythmic pattern. Compare the Raw and Filtered columns — the filtered one should be much smoother!

2. **Visualise with Serial Plotter:** If you have Arduino IDE installed, plug in your Pico, open Serial Plotter (Tools > Serial Plotter), and set baud rate to 115200. You should see your pulse wave drawn in real time! It is an incredible sight.

3. **Adjust alpha:** Change `#define ALPHA_PERCENT 75` to `90`. Now the filter trusts the old reading even more. Is the signal smoother? Does it respond to beats faster or slower? Try `50` for a noisier but faster response.

4. **Exercise experiment:** Take your resting BPM reading. Then do 30 jumping jacks, put your finger back on the sensor, and watch the BPM climb! How fast does it go up? How quickly does it return to normal?

---

## Challenge

**Build a Fitness Tracker!**

Modify the code to run a special 30-second measurement mode when the program starts. Print a countdown and then collect beats for exactly 30 seconds.

At the end, print this report to serial:

```
╔══════════════════════════════════════╗
║     YOUR FITNESS TRACKER RESULTS    ║
╠══════════════════════════════════════╣
║ Beats in 30 seconds: XX             ║
║ Estimated BPM: XX                   ║
║ Status: Normal / A bit fast / Slow  ║
╚══════════════════════════════════════╝
```

Use these ranges for the status:
- Below 60 BPM: "Slow down — are you a professional athlete?"
- 60–100 BPM: "Normal! Your heart is doing great."
- 101–120 BPM: "A bit fast — did you just run here?"
- Above 120 BPM: "Very fast! Take a rest!"

**Bonus:** Flash the RGB LED green for "normal", yellow for "a bit fast", and red for "very fast" after the result is shown.

---

## Summary

The heartbeat sensor detects your pulse by shining infrared light through your fingertip and measuring the tiny changes in how much light passes through with each heartbeat — the same principle used in hospital pulse oximeters and smartwatches. Because real sensor signals are noisy, you learned to apply an Exponential Moving Average filter that smooths out the noise while preserving the underlying heartbeat pattern, and you used a two-state peak detector to count beats and calculate your BPM. These signal-processing techniques — filtering, peak detection, and windowed averaging — are used in electronics everywhere from audio equipment to medical devices!
